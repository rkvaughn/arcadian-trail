export class Logger {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = message;
    this.container.insertBefore(entry, this.container.firstChild);
    // Newest entries are on top: scroll the log box itself, never the page
    // (page scrolling would push the event pop-up off screen on phones)
    this.container.scrollTop = 0;

    // Keep log manageable
    while (this.container.children.length > 50) {
      this.container.removeChild(this.container.lastChild);
    }
  }

  clear() {
    this.container.innerHTML = '';
  }
}
