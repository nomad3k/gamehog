import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class Button extends React.Component {
  static propTypes = {
    type: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }

  static defaultProps = {
    type: 'button'
  }

  render() {
    const { type, className, style, onClick } = this.props;
    const c = classnames('gh-button', className);
    const attributes = { className: c, type, style, onClick };
    return (
      <button {...attributes}>
        {this.props.children}
      </button>
    );
  }
}