export default class User {
  constructor(username, password, playerName, characterName) {
    this.username = username;
    this.password = password;
    this.playerName = playerName;
    this.characterName = characterName;
  }
  matchPassword(password) {
    return this.password = password;
  }
  data() {
    return {
      username: this.username,
      playerName: this.playerName,
      characterName: this.characterName
    };
  }
}
