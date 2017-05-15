import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class PlayerItem extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    player: PropTypes.object.isRequired,
    me: PropTypes.bool.isRequired
  }
  render() {
    const { id, player, me } = this.props;
    const c = classnames('gh-player-item', {
      'gh-player-item--connected': player.connected,
      'gh-player-item--me': me
    });
    return (
      <div className={c}>
        <div className='gh-player-item__header'>
          <div className='gh-player-item__header-character'>{player.characterName}</div>
          <div className='gh-player-item__header-player'>{player.playerName}</div>
        </div>
        <div className='gh-player-item__content'>
        </div>
      </div>
    );
  }
}
