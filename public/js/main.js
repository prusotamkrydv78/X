document.addEventListener('DOMContentLoaded', function() {
    // Toggle More dropdown
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
    
    // Theme toggle functionality - IMPROVED VERSION
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Apply theme settings on load
    function applyTheme(theme) {
        if (theme === 'light') {
            htmlElement.classList.remove('dark');
            htmlElement.classList.add('light');
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#0f1419';
            
            // Update icon visibility
            document.querySelectorAll('.dark-only').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.light-only').forEach(el => el.classList.remove('hidden'));
            
            // Update background colors
            document.querySelectorAll('.bg-black').forEach(el => {
                el.classList.remove('bg-black');
                el.classList.add('bg-white');
            });
            
            document.querySelectorAll('.bg-gray-900').forEach(el => {
                el.classList.remove('bg-gray-900');
                el.classList.add('bg-gray-100');
            });
            
            document.querySelectorAll('.bg-gray-800').forEach(el => {
                el.classList.remove('bg-gray-800');
                el.classList.add('bg-gray-200');
            });
            
            // Update border colors
            document.querySelectorAll('.border-gray-800').forEach(el => {
                el.classList.remove('border-gray-800');
                el.classList.add('border-gray-200');
            });
            
            // Update text colors
            document.querySelectorAll('.text-white').forEach(el => {
                if (!el.classList.contains('bg-blue-500') && 
                    !el.closest('.bg-blue-500')) {
                    el.classList.remove('text-white');
                    el.classList.add('text-black');
                }
            });
            
            document.querySelectorAll('.text-gray-500').forEach(el => {
                el.classList.remove('text-gray-500');
                el.classList.add('text-gray-600');
            });
            
            // Update hover states
            document.querySelectorAll('.hover\\:bg-gray-900').forEach(el => {
                el.classList.remove('hover:bg-gray-900');
                el.classList.add('hover:bg-gray-100');
            });
            
            document.querySelectorAll('.hover\\:bg-gray-800').forEach(el => {
                el.classList.remove('hover:bg-gray-800');
                el.classList.add('hover:bg-gray-200');
            });
        } else {
            htmlElement.classList.add('dark');
            htmlElement.classList.remove('light');
            document.body.style.backgroundColor = '#000000';
            document.body.style.color = '#ffffff';
            
            // Update icon visibility
            document.querySelectorAll('.light-only').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.dark-only').forEach(el => el.classList.remove('hidden'));
            
            // Update background colors
            document.querySelectorAll('.bg-white').forEach(el => {
                el.classList.remove('bg-white');
                el.classList.add('bg-black');
            });
            
            document.querySelectorAll('.bg-gray-100').forEach(el => {
                el.classList.remove('bg-gray-100');
                el.classList.add('bg-gray-900');
            });
            
            document.querySelectorAll('.bg-gray-200').forEach(el => {
                el.classList.remove('bg-gray-200');
                el.classList.add('bg-gray-800');
            });
            
            // Update border colors
            document.querySelectorAll('.border-gray-200').forEach(el => {
                el.classList.remove('border-gray-200');
                el.classList.add('border-gray-800');
            });
            
            // Update text colors
            document.querySelectorAll('.text-black').forEach(el => {
                if (!el.classList.contains('bg-white') && 
                    !el.closest('.bg-white')) {
                    el.classList.remove('text-black');
                    el.classList.add('text-white');
                }
            });
            
            document.querySelectorAll('.text-gray-600').forEach(el => {
                el.classList.remove('text-gray-600');
                el.classList.add('text-gray-500');
            });
            
            // Update hover states
            document.querySelectorAll('.hover\\:bg-gray-100').forEach(el => {
                el.classList.remove('hover:bg-gray-100');
                el.classList.add('hover:bg-gray-900');
            });
            
            document.querySelectorAll('.hover\\:bg-gray-200').forEach(el => {
                el.classList.remove('hover:bg-gray-200');
                el.classList.add('hover:bg-gray-800');
            });
        }
    }
    
    // Apply theme on page load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const newTheme = htmlElement.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            
            // Close dropdown
            if (moreDropdown) {
                moreDropdown.classList.add('hidden');
            }
        });
    }
    
    // Compose tweet modal
    const composeButton = document.getElementById('compose-tweet');
    const composeModal = document.getElementById('compose-modal');
    const closeComposeButton = document.getElementById('close-compose');
    
    if (composeButton && composeModal && closeComposeButton) {
        composeButton.addEventListener('click', function() {
            composeModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
        
        closeComposeButton.addEventListener('click', function() {
            composeModal.classList.add('hidden');
            document.body.style.overflow = '';
        });
        
        // Close modal when clicking outside
        composeModal.addEventListener('click', function(event) {
            if (event.target === composeModal) {
                composeModal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Add event listeners to tweet actions
    const likeButtons = document.querySelectorAll('.tweet-action.like');
    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const icon = button.querySelector('i');
            const counter = button.querySelector('span');
            
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
        });
    });
    
    // Retweet buttons
    const retweetButtons = document.querySelectorAll('.tweet-action.retweet');
    retweetButtons.forEach(button => {
        button.addEventListener('click', function() {
            const counter = button.querySelector('span');
            
            if (button.classList.contains('text-green-500')) {
                button.classList.remove('text-green-500');
                counter.textContent = (parseInt(counter.textContent.replace(',', '')) - 1).toLocaleString();
            } else {
                button.classList.add('text-green-500');
                counter.textContent = (parseInt(counter.textContent.replace(',', '')) + 1).toLocaleString();
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

    // Mobile compose tweet button
    const mobileComposeButton = document.getElementById('compose-tweet-mobile');
    if (mobileComposeButton && composeModal) {
        mobileComposeButton.addEventListener('click', function() {
            composeModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
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
}); 