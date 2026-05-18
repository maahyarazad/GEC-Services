const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer style={{
            width: "100%",
            padding: "16px 24px",
            backgroundColor: "#f3f4f6",
            borderTop: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: "0.8rem",
            textAlign: "center",
            fontWeight: 400,
            letterSpacing: "0.01em",
        }}>
            © {year} German Emirates Club — All Rights Reserved
        </footer>
    );
};

export default Footer;
