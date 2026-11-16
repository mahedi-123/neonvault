import { Component } from 'react';

/**
 * Catches any construction-time or runtime failure in the 3D tree (including
 * WebGL context loss surfaced as a thrown error) and swaps to the same DOM
 * fallback used for unsupported/reduced-motion devices, instead of taking
 * down the route.
 */
class VaultErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('NEON VAULT 3D experience failed, falling back to DOM view.', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default VaultErrorBoundary;
