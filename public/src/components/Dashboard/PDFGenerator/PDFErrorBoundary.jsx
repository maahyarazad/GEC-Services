import React, { Component, forwardRef } from 'react';

class PDFErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PDF Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  componentDidMount() {
    if (this.props.forwardedRef) {
      this.props.forwardedRef.current = this;
    }
  }

  componentWillUnmount() {
    if (this.props.forwardedRef) {
      this.props.forwardedRef.current = null;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          aria-live="assertive"
          style={{ padding: '1rem', color: 'red', textAlign: 'center' }}
        >
          <p>Failed to render PDF.</p>
          <button onClick={this.handleRetry} style={{ cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Forward ref wrapper component
const PDFErrorBoundary = forwardRef((props, ref) => (
  <PDFErrorBoundaryInner {...props} forwardedRef={ref} />
));

export default PDFErrorBoundary;
