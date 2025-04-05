document.addEventListener('DOMContentLoaded', function() {
    // Compose tweet modal functionality
    const composeButton = document.getElementById('compose-tweet');
    const composeModalButton = document.getElementById('compose-tweet-mobile');
    const composeModal = document.getElementById('compose-modal');
    const closeComposeButton = document.getElementById('close-compose');

    if (composeButton && composeModal) {
        composeButton.addEventListener('click', function() {
            composeModal.classList.remove('hidden');
        });
    }

    if (composeModalButton && composeModal) {
        composeModalButton.addEventListener('click', function() {
            composeModal.classList.remove('hidden');
        });
    }

    if (closeComposeButton && composeModal) {
        closeComposeButton.addEventListener('click', function() {
            composeModal.classList.add('hidden');
        });
    }

    // More dropdown functionality
    const moreButton = document.getElementById('more-button');
    const moreDropdown = document.getElementById('more-dropdown');

    if (moreButton && moreDropdown) {
        moreButton.addEventListener('click', function() {
            moreDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!moreButton.contains(event.target) && !moreDropdown.contains(event.target)) {
                moreDropdown.classList.add('hidden');
            }
        });
    }

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            // Toggle dark class on the HTML element
            document.documentElement.classList.toggle('dark');

            // Toggle visibility of dark/light mode icons and text
            const darkElements = document.querySelectorAll('.dark-only');
            const lightElements = document.querySelectorAll('.light-only');

            darkElements.forEach(el => el.classList.toggle('hidden'));
            lightElements.forEach(el => el.classList.toggle('hidden'));

            // Store preference in localStorage
            const isDarkMode = document.documentElement.classList.contains('dark');
            localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        });

        // Check for saved theme preference
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'disabled') {
            document.documentElement.classList.remove('dark');
            document.querySelectorAll('.dark-only').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.light-only').forEach(el => el.classList.remove('hidden'));
        }
    }

    // Add event listeners to tweet actions with AJAX
    const likeButtons = document.querySelectorAll('.tweet-action.like');
    likeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // If inside a form, prevent default form submission
            if (button.closest('form')) {
                e.preventDefault();
            }

            const icon = button.querySelector('i');
            const counter = button.querySelector('span');
            const tweetId = button.closest('form') ? button.closest('form').action.split('/').slice(-2)[0] : null;

            if (tweetId) {
                // Send AJAX request
                fetch(`/tweets/${tweetId}/like`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    // Update UI based on response
                    if (data.liked) {
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid');
                        button.classList.add('text-red-500');
                    } else {
                        icon.classList.remove('fa-solid');
                        icon.classList.add('fa-regular');
                        button.classList.remove('text-red-500');
                    }
                    counter.textContent = data.likes;
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            } else {
                // Fallback for static demo
                if (icon.classList.contains('fa-regular')) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid');
                    button.classList.add('text-red-500');
                    counter.textContent = (parseInt(counter.textContent.replace(',', '')) + 1).toLocaleString();
                } else {
                    icon.classList.remove('fa-solid');
                    icon.classList.add('fa-regular');
                    button.classList.remove('text-red-500');
                    counter.textContent = (parseInt(counter.textContent.replace(',', '')) - 1).toLocaleString();
                }
            }
        });
    });

    // Retweet buttons with AJAX
    const retweetButtons = document.querySelectorAll('.tweet-action.retweet');
    retweetButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // If inside a form, prevent default form submission
            if (button.closest('form')) {
                e.preventDefault();
            }

            const counter = button.querySelector('span');
            const tweetId = button.closest('form') ? button.closest('form').action.split('/').slice(-2)[0] : null;

            if (tweetId) {
                // Send AJAX request
                fetch(`/tweets/${tweetId}/retweet`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    // Update UI based on response
                    if (data.retweeted) {
                        button.classList.add('text-green-500');
                    } else {
                        button.classList.remove('text-green-500');
                    }
                    counter.textContent = data.retweets;
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            } else {
                // Fallback for static demo
                if (button.classList.contains('text-green-500')) {
                    button.classList.remove('text-green-500');
                    counter.textContent = (parseInt(counter.textContent.replace(',', '')) - 1).toLocaleString();
                } else {
                    button.classList.add('text-green-500');
                    counter.textContent = (parseInt(counter.textContent.replace(',', '')) + 1).toLocaleString();
                }
            }
        });
    });

    // Improved tab switching in profile page with history API
    const profileTabs = document.querySelectorAll('.profile-tabs a');
    if (profileTabs.length > 0) {
        profileTabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                // Let the browser handle the actual navigation
                // The server will render the appropriate tab content
                // No need to prevent default or manipulate history manually

                // Optional: Add smooth scrolling to top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        });
    }

    // Fix viewport height issues on mobile
    function setMobileHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // Set the height on page load
    setMobileHeight();

    // Update the height on window resize
    window.addEventListener('resize', setMobileHeight);

    // Fix for iOS Safari address bar height changes
    window.addEventListener('orientationchange', setMobileHeight);

    // Handle image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        // Add loading class to show loading state
        img.classList.add('loading');

        img.addEventListener('load', function() {
            // Remove loading class when loaded
            img.classList.remove('loading');
        });

        img.addEventListener('error', function() {
            // On error, replace with placeholder
            img.src = 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png';
            img.classList.remove('loading');

            // If it's a profile image, add a specific class
            if (img.classList.contains('rounded-full')) {
                img.classList.add('profile-image');
            }
        });
    });

    // Socket.io real-time functionality
    if (typeof io !== 'undefined') {
        // Connect to Socket.io server
        const socket = io();

        // Handle real-time notifications
        socket.on('notification', function(data) {
            // Update notification badge
            const notificationBadge = document.querySelector('.notification-badge');
            if (notificationBadge) {
                notificationBadge.style.display = 'flex';
            }

            // Show toast notification (optional)
            showToast(`New notification from ${data.notification.sender.name}`);
        });

        // Handle real-time messages
        socket.on('messageNotification', function(data) {
            // Update message badge
            const messageBadge = document.querySelector('.message-badge');
            if (messageBadge) {
                messageBadge.style.display = 'flex';
            }

            // Show toast notification (optional)
            showToast(`New message from ${data.user.name}`);
        });

        // Handle new messages in conversation
        socket.on('newMessage', function(data) {
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                // Create new message element
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${data.message.sender === currentUserId ? 'flex justify-end' : ''}`;

                // Add message content
                // ... (message HTML structure)

                // Append to container and scroll to bottom
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    }

    // Simple toast notification function
    function showToast(message) {
        // Create toast element if it doesn't exist
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-full opacity-0';
            document.body.appendChild(toast);
        }

        // Set message and show toast
        toast.textContent = message;
        toast.classList.remove('translate-y-full', 'opacity-0');

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
        }, 3000);
    }
});