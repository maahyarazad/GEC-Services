import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

import '../utils/login.css';

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { GoShieldLock } from 'react-icons/go';
import { MdPersonOutline, MdCardMembership, MdCheckCircle, MdHighlightOff } from 'react-icons/md';

import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import { useSnackbar } from '../Providers/Snackbar';

const validationSchema = Yup.object({
    password: Yup.string().required('Password is required!'),
});

const initialValues = { password: '' };

const titleCase = (val) =>
    typeof val === 'string' && val
        ? val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : val;

const fullName = (...parts) => parts.filter(Boolean).join(' ').trim();

// ── Presentational helpers ─────────────────────────────────────────────────────

const SectionCard = ({ title, icon, action, children }) => (
    <Paper elevation={2} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}
            >
                {icon} {title}
            </Typography>
            {action}
        </Box>
        {children}
    </Paper>
);

const DetailRow = ({ label, value }) => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            py: 0.85,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 'none' },
        }}
    >
        <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
            {value || value === 0 ? value : '—'}
        </Typography>
    </Box>
);

const EventRegistration = () => {
    // Route: /event-registration/:queryParam — param carries the attendance query
    // string, e.g. "contactId=123&eventId=456".
    const { queryParam } = useParams();
    const { showSnackbar } = useSnackbar();

    const params = new URLSearchParams(queryParam || '');
    const contactId = params.get('contactId');
    const eventId = params.get('eventId');

    const statusRef = useRef();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [operatorUser, setOperatorUser] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attendance, setAttendance] = useState(null); // { ok, message }
    const [contact, setContact] = useState(null);
    const [gecMember, setGecMember] = useState(null);

    const SERVER = import.meta.env.VITE_SERVERURL;

    // ── Mark attendance + load contact and GEC membership details ──────────────
    const loadData = useCallback(async () => {
        if (!contactId || !eventId) {
            setError('Invalid registration link — missing contact or event reference.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // 1. Mark attendance complete (operator-protected).
            const attRes = await fetch(
                `${SERVER}/registration/contacts/complete-attendance?contactId=${contactId}&eventId=${eventId}`,
                { method: 'PATCH', credentials: 'include' }
            );

            // Session expired / not an operator — fall back to the login form.
            if (attRes.status === 401 || attRes.status === 403) {
                setOperatorUser(false);
                return;
            }

            const attData = await attRes.json().catch(() => ({}));
            setAttendance({
                ok: attRes.ok,
                message: attData.message || (attRes.ok ? 'Attendance marked complete' : 'Could not mark attendance'),
            });
            showSnackbar(attData.message || 'Attendance updated', attRes.ok ? 'success' : '');

            // 2. Fetch the contact record.
            const cRes = await fetch(`${SERVER}/api/contacts/${contactId}`, { credentials: 'include' });
            const cData = await cRes.json().catch(() => ({}));
            const contactRecord = cData.status ? cData.data : null;
            setContact(contactRecord);

            // 3. Look up GEC membership using the contact's phone (+ name).
            if (contactRecord?.phone) {
                const name = fullName(contactRecord.first_name, contactRecord.last_name);
                const url =
                    `${SERVER}/gec/members/check?phone_number=${encodeURIComponent(contactRecord.phone)}` +
                    (name ? `&full_name=${encodeURIComponent(name)}` : '');
                const gRes = await fetch(url, { credentials: 'include' });
                const gData = await gRes.json().catch(() => ({}));
                setGecMember(gData.status && Array.isArray(gData.data) && gData.data.length ? gData.data[0] : null);
            }
        } catch (err) {
            console.error('Failed to load registration details:', err);
            setError('Failed to load registration details.');
        } finally {
            setLoading(false);
        }
    }, [contactId, eventId, SERVER, showSnackbar]);

    // ── On load: detect an existing operator session, then load details ────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${SERVER}/operator/check-auth`, { credentials: 'include' });
                if (!cancelled && res.ok) {
                    setOperatorUser(true);
                    loadData();
                }
            } catch {
                // Not authenticated — the login form will be shown.
            } finally {
                if (!cancelled) setIsCheckingAuth(false);
            }
        })();
        return () => { cancelled = true; };
    }, [loadData, SERVER]);

    const handleLoginSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            setSubmitting(true);
            if (statusRef.current) statusRef.current.textContent = '';

            const formData = new FormData();
            formData.append('password', values.password);

            const response = await fetch(`${SERVER}/operator/login`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setOperatorUser(true);
                resetForm();
                loadData();
            } else if (statusRef.current) {
                statusRef.current.textContent = data.error || 'Invalid Password!';
            }
        } catch (err) {
            console.error('Login error:', err);
            if (statusRef.current) {
                statusRef.current.textContent = 'An unexpected error occurred.';
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="w-100 d-flex align-items-center justify-content-center" style={{ height: '100dvh' }}>
                <CircularProgress />
            </div>
        );
    }

    if (!operatorUser) {
        return (
            <div className="login">
                <div>
                    <h4>Operator login required to continue.</h4>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleLoginSubmit}
                    >
                        {({ setFieldValue, errors, touched, isSubmitting }) => (
                            <Form>
                                <div className="full position-relative">
                                    <Field
                                        onChange={(e) => setFieldValue('password', e.target.value)}
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter operator password"
                                        className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                                        style={{
                                            paddingRight: '2.5rem',
                                            backgroundImage: 'none',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right calc(0.375em + 0.1875rem) center',
                                            backgroundSize: '0 0',
                                        }}
                                    />
                                    <span
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: '10px',
                                            transform: 'translateY(-50%)',
                                            cursor: 'pointer',
                                            color: '#6c757d',
                                        }}
                                    >
                                        {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                                    </span>
                                </div>
                                <div className="cta-zone d-flex justify-content-between align-items-center">
                                    <div>
                                        <ErrorMessage name="password" component="div" className="text-danger small" />
                                    </div>
                                    <Button
                                        className="mt-1"
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        style={{ textTransform: 'none', width: '100%' }}
                                        startIcon={<GoShieldLock size={20} color="white" />}
                                    >
                                        Login
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                    <p ref={statusRef} className="text-danger"></p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-100 d-flex align-items-center justify-content-center" style={{ height: '100dvh' }}>
                <CircularProgress />
            </div>
        );
    }

    return (
        <Box sx={{ minHeight: '100dvh', bgcolor: '#f5f5f7', py: 3, px: 1.5 }}>
            <Container maxWidth="sm" disableGutters>
                <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 800, mb: 2 }}>
                    Event Registration
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>}

                {/* Attendance status */}
                {attendance && (
                    <Paper
                        elevation={2}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            mb: 2,
                            textAlign: 'center',
                            bgcolor: attendance.ok ? '#e6f7e9' : '#fdecea',
                        }}
                    >
                        <Box sx={{ fontSize: 44, lineHeight: 1, color: attendance.ok ? 'success.main' : 'error.main' }}>
                            {attendance.ok ? <MdCheckCircle /> : <MdHighlightOff />}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                            {attendance.message}
                        </Typography>
                    </Paper>
                )}

                {/* Contact information */}
                {contact ? (
                    <SectionCard title="Contact Information" icon={<MdPersonOutline size={18} />}>
                        <DetailRow label="Name" value={fullName(titleCase(contact.title), contact.first_name, contact.last_name)} />
                        <DetailRow label="Phone" value={contact.phone} />
                        <DetailRow label="Gender" value={titleCase(contact.gender)} />
                        <DetailRow label="Language" value={contact.language ? contact.language.toUpperCase() : '—'} />
                        <DetailRow label="Type" value={titleCase(contact.type)} />
                        {contact.club_partner_name && (
                            <DetailRow label="Club Partner" value={contact.club_partner_name} />
                        )}
                        <DetailRow label="Contact ID" value={contact.id} />
                    </SectionCard>
                ) : (
                    !error && (
                        <SectionCard title="Contact Information" icon={<MdPersonOutline size={18} />}>
                            <Typography variant="body2" color="text.secondary">
                                No contact record found for this registration.
                            </Typography>
                        </SectionCard>
                    )
                )}

                {/* GEC membership */}
                <SectionCard
                    title="GEC Membership"
                    icon={<MdCardMembership size={18} />}
                    action={
                        <Chip
                            size="small"
                            color={gecMember ? 'success' : 'default'}
                            label={gecMember ? 'Active Member' : 'Not a Member'}
                            variant={gecMember ? 'filled' : 'outlined'}
                        />
                    }
                >
                    {gecMember ? (
                        <>
                            <DetailRow label="Member Name" value={fullName(gecMember.first_name, gecMember.name)} />
                            <DetailRow label="Member ID" value={gecMember.usrId} />
                            <DetailRow label="Email" value={gecMember.email} />
                            <DetailRow label="Phone" value={gecMember.phone} />
                            <DetailRow
                                label="Member Since"
                                value={gecMember.time ? new Date(gecMember.time).toLocaleDateString() : '—'}
                            />
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No active GEC membership found for this contact.
                        </Typography>
                    )}
                </SectionCard>
            </Container>
        </Box>
    );
};

export default EventRegistration;
