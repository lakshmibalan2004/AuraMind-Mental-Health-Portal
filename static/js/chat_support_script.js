// static/js/chat_support_script.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("Chat SCRIPT: DOMContentLoaded - Script is starting."); // DEBUG

    const socket = io();
    console.log("Chat SCRIPT: Socket.IO client initialized object:", socket); // DEBUG

    const chatMessagesContainer = document.getElementById('chatMessages');
    const messageInput = document.getElementById('chatMessageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const suggestedPromptButtons = document.querySelectorAll('.prompt-btn');
    const companionItems = document.querySelectorAll('.companion-item');
    const profileIconHeader = document.getElementById('profileIconHeader');
    const profileDropdown = document.getElementById('profileDropdown');

    // Ensure these global variables for avatar URLs are correctly defined in your HTML script block
    // const userProfileImage = (typeof userProfileImage !== 'undefined') ? userProfileImage : '/static/images/default-profile.jpg';
    // const drEmpathyAvatarStatic = (typeof drEmpathyAvatarStatic !== 'undefined') ? drEmpathyAvatarStatic : '/static/images/placeholder-avatar.png';
    let currentCompanionAvatar = typeof drEmpathyAvatarStatic !== 'undefined' ? drEmpathyAvatarStatic : '/static/images/placeholder-avatar.png';


    if (profileIconHeader && profileDropdown) {
        profileIconHeader.addEventListener('click', function(event) {
            event.preventDefault();
            profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', function(event) {
            if (profileIconHeader && profileDropdown && !profileIconHeader.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }

    function updateChatHeader(companionElement) {
        if (!companionElement || !companionElement.querySelector('.companion-name')) return; // Guard
        const name = companionElement.querySelector('.companion-name').textContent;
        const specialty = companionElement.querySelector('.companion-specialty').textContent;
        currentCompanionAvatar = companionElement.querySelector('.companion-avatar').src;

        if(document.getElementById('chatHeaderName')) document.getElementById('chatHeaderName').textContent = name;
        if(document.getElementById('chatHeaderSpecialty')) document.getElementById('chatHeaderSpecialty').textContent = specialty;
        if(document.getElementById('chatHeaderAvatar')) document.getElementById('chatHeaderAvatar').src = currentCompanionAvatar;
        if(messageInput) messageInput.placeholder = `Write a message to ${name}...`;
    }

    function scrollToBottom() {
        if (chatMessagesContainer) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
    // Initial scroll after static messages might be rendered, or if content is loaded dynamically
    setTimeout(scrollToBottom, 100); // Slight delay to ensure content is there

    // --- Socket.IO Event Listeners ---
    socket.on('connect', function() {
        console.log('Chat SCRIPT: Socket.IO: Connected to server! SID:', socket.id);
    });

    socket.on('disconnect', function(reason) {
        console.log('Chat SCRIPT: Socket.IO: Disconnected from server. Reason:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('Chat SCRIPT: Socket.IO: Connection Error!', err);
    });
    
    socket.on('connection_response', function(data) {
        console.log('Chat SCRIPT: Socket.IO: Server says:', data.message);
    });

    socket.on('ai_response', function(data) {
        console.log('Chat SCRIPT: Socket.IO: Received AI response:', data);
        if (data && data.text) {
            appendMessage(data.text, 'ai', currentCompanionAvatar);
        } else {
            console.error("Chat SCRIPT: Received AI response but 'text' field is missing.", data);
        }
    });
    // --- End Socket.IO Event Listeners ---
    
    function appendMessage(text, sender, avatarSrcToUse) {
        if (!chatMessagesContainer) {
            console.error("Chat SCRIPT: chatMessagesContainer not found for appendMessage.");
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender === 'user' ? 'user-message' : 'ai-message');

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('message-avatar');
        
        let resolvedAvatarSrc = '/static/images/placeholder-avatar.png'; // Default fallback
        if (sender === 'user') {
            resolvedAvatarSrc = (typeof userProfileImage !== 'undefined' ? userProfileImage : '/static/images/default-profile.jpg');
        } else { // AI
            resolvedAvatarSrc = avatarSrcToUse || currentCompanionAvatar;
        }
        avatarImg.src = resolvedAvatarSrc;
        avatarImg.alt = sender === 'user' ? 'User Avatar' : 'AI Avatar';
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.appendChild(p);

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('message-meta');
        const timeSpan = document.createElement('span');
        timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        metaDiv.appendChild(timeSpan);

        if (sender === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarImg);
        } else { 
            messageDiv.appendChild(avatarImg);
            messageDiv.appendChild(contentDiv);
            // Optional: Add reaction buttons for AI
            // ...
        }
        contentDiv.appendChild(metaDiv);

        chatMessagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // --- DEFINED sendUserMessage function ---
    function sendUserMessage(messageText) {
        if (!messageText || !messageText.trim()) {
            console.log("Chat SCRIPT: sendUserMessage - Message is empty, not sending.");
            return;
        }
        if (!socket || !socket.connected) {
            console.error("Chat SCRIPT: sendUserMessage - Socket is not connected. Cannot send message.");
            appendMessage("Error: Not connected to chat server. Please refresh.", 'system-error'); // You'd need a 'system-error' style
            return;
        }

        console.log("Chat SCRIPT: sendUserMessage - Appending user message to UI:", messageText);
        appendMessage(messageText, 'user'); 

        console.log("Chat SCRIPT: sendUserMessage - Attempting to EMIT 'user_message' with data:", { message: messageText });
        socket.emit('user_message', { message: messageText }); 
        
        if(messageInput) {
            messageInput.value = '';
            console.log("Chat SCRIPT: sendUserMessage - Cleared message input.");
        }
    }
    // --- END sendUserMessage function ---

    // --- UPDATED Event Listeners for sending messages ---
    if (sendMessageBtn && messageInput) {
        sendMessageBtn.addEventListener('click', function() {
            console.log("Chat SCRIPT: Send button CLICKED.");
            sendUserMessage(messageInput.value);
        });
        
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for new line
                e.preventDefault(); 
                console.log("Chat SCRIPT: Enter key PRESSED in input.");
                sendUserMessage(messageInput.value);
            }
        });
    } else {
        console.error("Chat SCRIPT: Send button or message input element not found!");
    }

    suggestedPromptButtons.forEach(button => {
        button.addEventListener('click', function() {
            const promptText = this.textContent;
            console.log("Chat SCRIPT: Suggested prompt CLICKED:", promptText);
            sendUserMessage(promptText); // Send the prompt text as a user message
        });
    });
    // --- END UPDATED Event Listeners ---

    companionItems.forEach(item => {
        item.addEventListener('click', function() {
            companionItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            updateChatHeader(this);
            
            const companionName = this.querySelector('.companion-name').textContent;
            if(chatMessagesContainer) {
                chatMessagesContainer.innerHTML = ''; // Clear previous messages
                const initialGreeting = `You are now chatting with ${companionName}. How can I help you today?`;
                appendMessage(initialGreeting, 'ai', this.querySelector('.companion-avatar').src); 
            }
            console.log("Chat SCRIPT: Selected AI Companion:", companionName);
        });
    });

    const activeCompanion = document.querySelector('.companion-item.active');
    if (activeCompanion) {
        updateChatHeader(activeCompanion);
        // Only add initial greeting if chat is empty (e.g. no messages loaded from history)
        if (chatMessagesContainer && chatMessagesContainer.children.length === 0) { 
            const initialGreetingText = `Hello there! I'm ${activeCompanion.querySelector('.companion-name').textContent}. How are you feeling today, and what's on your mind?`;
            appendMessage(initialGreetingText, 'ai', activeCompanion.querySelector('.companion-avatar').src);
        }
    } else if (chatMessagesContainer && chatMessagesContainer.children.length === 0) {
        chatMessagesContainer.innerHTML = '<p style="text-align:center; color:#aaa;">Select an AI companion to start chatting.</p>';
    }
});