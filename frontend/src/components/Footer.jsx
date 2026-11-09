const Footer = () => (
  <footer style={{ background: "var(--color-midnight)", color: "#9db6cc", padding: "26px 0", marginTop: 0 }}>
    <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
      <span>© {new Date().getFullYear()} Wingspan. All rights reserved.</span>
      <span>Fly Further, Worry Less.</span>
    </div>
  </footer>
);

export default Footer;
