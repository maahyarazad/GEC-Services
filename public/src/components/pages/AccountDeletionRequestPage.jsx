import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";

const initialForm = {
  fullName: "",
  email: "",
  memberId: "",
  phone: "",
  country: "",
  reason: "",
  confirmOwnership: false,
  confirmDeletion: false,
};

export default function AccountDeletionRequestPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverState, setServerState] = useState({
    type: "",
    message: "",
  });

  const retentionText = useMemo(
    () =>
      "Some information may be retained for a limited period where required for legal, regulatory, security, fraud-prevention, accounting, or dispute-resolution purposes.",
    []
  );

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));

    setServerState({
      type: "",
      message: "",
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.confirmOwnership) {
      nextErrors.confirmOwnership =
        "You must confirm that this account belongs to you.";
    }

    if (!form.confirmDeletion) {
      nextErrors.confirmDeletion =
        "You must confirm that you want your account deleted.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setServerState({
      type: "",
      message: "",
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVERURL}/account-deletion-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          memberId: form.memberId.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          reason: form.reason.trim(),
          requestSource: "web",
          requestedAt: new Date().toISOString(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to submit your deletion request."
        );
      }

      setServerState({
        type: "success",
        message:
          data?.message ||
          "Your account deletion request has been submitted successfully. We will review and process it according to our retention and legal obligations.",
      });

      setForm(initialForm);
      setErrors({});
    } catch (error) {
      setServerState({
        type: "error",
        message:
          error?.message ||
          "Something went wrong while submitting your request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Box
            sx={{
              px: { xs: 3, md: 5 },
              py: { xs: 4, md: 5 },
              background:
                "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
              color: "common.white",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                <DeleteForeverRoundedIcon fontSize="large" style={{minWidth: '40px'}}/>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} style={{color: 'white'}}>
                  Request Account Deletion
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mt: 1, color: "rgba(255,255,255,0.82)" }}
                >
                  Submit this form to request deletion of your account and
                  associated personal data.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={3}>
              <Alert severity="info" icon={<PrivacyTipOutlinedIcon />}>
                Once your request is verified, we will delete your account and
                associated data, except information we must retain for legal,
                regulatory, security, fraud-prevention, accounting, or
                dispute-resolution purposes.
              </Alert>

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    label="Full name"
                    value={form.fullName}
                    onChange={handleChange("fullName")}
                    error={!!errors.fullName}
                    helperText={errors.fullName}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    error={!!errors.email}
                    helperText={
                      errors.email ||
                      "Use the email address linked to your account."
                    }
                    fullWidth
                    required
                  />
{/* 
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                  >
                    <TextField
                      label="Member ID / User ID"
                      value={form.memberId}
                      onChange={handleChange("memberId")}
                      fullWidth
                    />
                    <TextField
                      label="Phone number"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      fullWidth
                    />
                  </Stack>

                  <TextField
                    label="Country"
                    value={form.country}
                    onChange={handleChange("country")}
                    fullWidth
                  /> */}

                  <TextField
                    label="Additional details (optional)"
                    value={form.reason}
                    onChange={handleChange("reason")}
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Add anything that will help us identify your account or process your request."
                  />

                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      backgroundColor: "#f8fafc",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ShieldOutlinedIcon fontSize="small" />
                        <Typography variant="subtitle1" fontWeight={700}>
                          Important information
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        We may contact you to verify ownership before processing
                        your request.
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {retentionText}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        For more details, please review our{" "}
                        <Link
                          href="/privacy-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </Typography>
                    </Stack>
                  </Box>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.confirmOwnership}
                        onChange={handleChange("confirmOwnership")}
                      />
                    }
                    label="I confirm that I am the owner of this account or am authorized to request deletion."
                  />
                  {errors.confirmOwnership && (
                    <Typography variant="caption" color="error">
                      {errors.confirmOwnership}
                    </Typography>
                  )}

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.confirmDeletion}
                        onChange={handleChange("confirmDeletion")}
                      />
                    }
                    label="I understand that this request may permanently delete my account and associated data."
                  />
                  {errors.confirmDeletion && (
                    <Typography variant="caption" color="error">
                      {errors.confirmDeletion}
                    </Typography>
                  )}

                  {serverState.message ? (
                    <Alert severity={serverState.type || "info"}>
                      {serverState.message}
                    </Alert>
                  ) : null}

                  <Divider />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Need help instead? Contact{" "}
                      <Link href="mailto:support@yourdomain.com">
                        support@yourdomain.com
                      </Link>
                    </Typography>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={submitting}
                      sx={{
                        minWidth: 220,
                        borderRadius: 999,
                        py: 1.4,
                        fontWeight: 700,
                        textTransform: "none",
                      }}
                    >
                      {submitting ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={18} color="inherit" />
                          <span>Submitting...</span>
                        </Stack>
                      ) : (
                        "Submit deletion request"
                      )}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}