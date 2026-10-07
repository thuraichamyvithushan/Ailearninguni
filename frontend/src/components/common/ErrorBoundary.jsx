import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Application render failed", error);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="container public-section">
          <div className="empty card">
            <h1>Let’s find our way back.</h1>
            <p>The page couldn’t finish loading. Refresh to try again.</p>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              Refresh the page
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
