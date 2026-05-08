import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { GEC } from '../PartnerOnboarding/PartnerOnboardingStyles';

export default function BirthdayField({
    values,
    setFieldValue,
    setFieldTouched,
    errors,
    touched,
    size = "small",
    setWizardState,
    useGECStyle = false,
}) {

    const gecTextFieldSx = {
        width: "100%",

        // ── Input root — covers both MuiOutlinedInput (mobile) and MuiPickersInputBase (desktop) ──
        "& .MuiInputBase-root, & .MuiPickersInputBase-root": {
            minHeight: 53,
            height: 53,
            background: "#faf8f3",
            borderRadius: "8px !important",
            color: GEC.textPrimary,
            display: "flex",
            alignItems: "center",
        },

        // ── Inner content vertical centering ───────────────────────────
        "& .MuiInputBase-input, & .MuiPickersInputBase-input, & .MuiPickersSectionList-root": {
            display: "flex",
            alignItems: "center",
            paddingTop: "0 !important",
            paddingBottom: "0 !important",
            height: "100% !important",
            boxSizing: "border-box",
        },

        // ── Calendar icon adornment centering ──────────────────────────
        "& .MuiInputAdornment-root": {
            height: "100%",
            maxHeight: "unset",
            display: "flex",
            alignItems: "center",
            marginTop: "0 !important",
        },

        // ── Border — default ───────────────────────────────────────────
        "& .MuiOutlinedInput-notchedOutline, & .MuiPickersOutlinedInput-notchedOutline": {
            borderColor: GEC.goldBorder,
            top: -6,
            bottom: 5,
        },

        // ── Border — hover ─────────────────────────────────────────────
        "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline, & .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline": {
            borderColor: GEC.gold,
        },

        // ── Border — focused (kills MUI blue) ──────────────────────────
        "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline, & .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
            borderColor: `${GEC.gold} !important`,
            borderWidth: "1px !important",
            boxShadow: `0 0 0 3px ${GEC.goldMuted}`,
        },

        // ── Desktop section highlight when typing ──────────────────────
        "& .MuiPickersSection-root.Mui-selected, & .MuiPickersSection-root:focus": {
            color: GEC.goldDark,
            backgroundColor: GEC.goldMuted,
            outline: "none",
            borderRadius: 1,
        },

        // ── Calendar icon ──────────────────────────────────────────────
        "& .MuiIconButton-root": {
            color: GEC.textSecondary,
            "&:hover": {
                color: GEC.goldDark,
                background: GEC.goldMuted,
            },
        },

        // ── Helper / error text ────────────────────────────────────────
        "& .MuiFormHelperText-root": { color: "#ef4444" },
        "& input::placeholder": { color: "#a89b7a" },
    };

    const defaultTextFieldSx = {
        width: "100%",
        "& .MuiPickersInputBase-root.MuiPickersInputBase-root": {
            minHeight: 53,
        },
    };

    // Shared calendar / dialog paper styles
    const calendarPaperSx = {
        background: "#faf8f3",
        border: `1px solid ${GEC.goldBorder}`,
        borderRadius: 2,
        boxShadow: `0 8px 32px rgba(185,150,43,0.14), 0 2px 8px rgba(0,0,0,0.06)`,
        "& .MuiPickersDay-root": {
            color: GEC.textPrimary,
            borderRadius: "50%",
            "&:hover": { background: GEC.goldMuted },
            "&.Mui-selected": {
                background: `linear-gradient(135deg, ${GEC.gold}, ${GEC.goldDark})`,
                color: "#fff",
                "&:hover": {
                    background: `linear-gradient(135deg, ${GEC.goldLight}, ${GEC.gold})`,
                },
            },
            "&.MuiPickersDay-today": {
                border: `1px solid ${GEC.gold}`,
                color: GEC.goldDark,
                background: GEC.goldMuted,
            },
        },
        "& .MuiDayCalendar-weekDayLabel": {
            color: GEC.textSecondary,
            fontWeight: 600,
        },
        "& .MuiPickersCalendarHeader-label": {
            color: GEC.textPrimary,
            fontWeight: 700,
            fontFamily: "'Georgia', serif",
        },
        "& .MuiPickersArrowSwitcher-button": {
            color: GEC.textSecondary,
            "&:hover": { color: GEC.goldDark },
        },
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="pb-2" style={{ width: "100%" }}>
                <DatePicker
                    label={useGECStyle ? undefined : "Birthday"}
                    value={values.birthday ? dayjs(values.birthday) : null}
                    onChange={(newValue) => {
                        const formattedValue = newValue
                            ? newValue.format("YYYY-MM-DD")
                            : "";
                        setFieldValue("birthday", formattedValue);
                        if (setWizardState) {
                            setWizardState((prev) => ({
                                ...prev,
                                member: { ...prev.member, birthday: formattedValue },
                            }));
                        }
                    }}
                    slotProps={{
                        textField: {
                            name: "birthday",
                            size,
                            fullWidth: true,
                            placeholder: useGECStyle ? "YYYY-MM-DD" : undefined,
                            sx: useGECStyle ? gecTextFieldSx : defaultTextFieldSx,
                            error: touched.birthday && Boolean(errors.birthday),
                            helperText: touched.birthday ? errors.birthday : "",
                            onBlur: () => setFieldTouched("birthday", true),
                            InputLabelProps: { shrink: true },
                        },
                        ...(useGECStyle && {
                            // Desktop popup
                            desktopPaper: { sx: calendarPaperSx },
                            // Mobile bottom-sheet dialog
                            mobilePaper: { sx: calendarPaperSx },
                            // "OK / Cancel" buttons inside mobile dialog
                            actionBar: {
                                sx: {
                                    "& .MuiButton-root": {
                                        color: GEC.goldDark,
                                        fontWeight: 600,
                                        "&:hover": { background: GEC.goldMuted },
                                    },
                                },
                            },
                        }),
                    }}
                />
            </div>
        </LocalizationProvider>
    );
}