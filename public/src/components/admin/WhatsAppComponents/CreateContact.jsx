import React, { useEffect, useState } from 'react';
import { useSnackbar } from '../../Providers/Snackbar';
import { Button, CircularProgress } from '@mui/material';

const defaultFormData = {
    title: '',
    first_name: '',
    last_name: '',
    gender: '',
    phone: '',
    type: '',
    club_partner_name: '',
    blacklist: false,
};

const CreateContact = ({ CloseModal, initialValues = null }) => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState(defaultFormData);

    /**
     * Populate form when initialValues are provided (EDIT MODE)
     */
    useEffect(() => {
        if (initialValues) {
            setFormData({
                ...defaultFormData,
                ...initialValues,
            });
        }
    }, [initialValues]);

    function normalizePhone(input) {
        let val = input.replace(/[^0-9+]/g, '');
        val = val.replace(/(?!^\+)\+/g, '');

        if (val.startsWith('0')) {
            val = '+' + val.slice(1);
        }

        return val;
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;

        if (name === 'phone') {
            newValue = normalizePhone(newValue);
        }

        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.type?.trim()) {
                showSnackbar("Please select a contact type", "warning");
                setLoading(false);
                return;
            }

            debugger;
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/${initialValues ? 'modify' : 'create'}`,
                {
                    method: initialValues ? "PUT" : "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }
            );

            const responseData = await response.json();

            debugger;
            if (!response.ok) {
                console.error(responseData.error);
                showSnackbar(responseData.message, "error");
            }else{
                CloseModal();
            }

            showSnackbar(responseData.message, "success");

            if (!initialValues) {
                setFormData(defaultFormData);
            }

         


        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="container">
                <div className="row">
                    <div className="col mb-3">
                        <label>First Name:</label>
                        <input
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>

                    <div className="col-6 mb-3">
                        <label>Last Name:</label>
                        <input
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-6 mb-3">
                        <label>Title:</label>
                        <input
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>

                    <div className="col-6 mb-3">
                        <label>Gender:</label>
                         <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            required
                            className="form-select"
                        >
                            <option value="">Select type</option>
                            <option value="club_member">Male</option>
                            <option value="club_partner">Female</option>
                            
                        </select>
                    </div>
                </div>

                <div className="row">
                    <div className="col-6 mb-3">
                        <label>Phone:</label>
                        <input
                            name="phone"
                            placeholder="+971501234567"
                            pattern="^\+?[0-9]{10,15}$"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>

                    <div className="col-6 mb-3">
                        <label>Type:</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            className="form-select"
                        >
                            <option value="">Select type</option>
                            <option value="club_member">Club Member</option>
                            <option value="club_partner">Club Partner</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12 mb-3">
                        <label>Club / Partner Name:</label>
                        <input
                            name="club_partner_name"
                            value={formData.club_partner_name}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-12 mb-4">
                        <label className="form-check-label d-flex align-items-center">
                            <input
                                type="checkbox"
                                name="blacklist"
                                checked={formData.blacklist}
                                onChange={handleChange}
                                className="form-check-input me-2"
                            />
                            Blacklisted
                        </label>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={loading}
                            sx={{ textTransform: 'none', width: '100%' }}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading
                                ? initialValues ? "Updating..." : "Creating..."
                                : initialValues ? "Update Contact" : "Create Contact"}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default CreateContact;
