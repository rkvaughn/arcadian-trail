export class Logger {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = message;
    this.container.insertBefore(entry, this.container.firstChild);
    entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Keep log manageable
    while (this.container.children.length > 50) {
      this.container.removeChild(this.container.lastChild);
    }
  }

  clear() {
    this.container.innerHTML = '';
  }
}
