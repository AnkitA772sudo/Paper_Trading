// Feature: paper-trading-app — Toast notification system
// Requirements: 13.3, 13.4

function showNotification(message, type) {
  let container = document.getElementById('notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

export { showNotification };
