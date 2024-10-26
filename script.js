// Перевірка, чи є ключі для приватного і публічного ключів
let privateKey, publicKey;

// Генерація ключів RSA для підпису повідомлень
window.crypto.subtle.generateKey(
    {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" }
    },
    true,
    ["sign", "verify"]
).then((keyPair) => {
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
});

// Функція для підпису повідомлення
async function signMessage(message) {
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);

    const signature = await window.crypto.subtle.sign(
        {
            name: "RSASSA-PKCS1-v1_5",
        },
        privateKey,
        encodedMessage
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Завантаження повідомлень з Local Storage
function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('messages')) || [];
    const messageList = document.getElementById("messageList");
    const noMessagesText = document.getElementById("noMessagesText");
    
    messageList.innerHTML = '';  // Очищуємо перед додаванням нових повідомлень
    if (messages.length === 0) {
        noMessagesText.style.display = 'block';  // Якщо немає повідомлень
    } else {
        noMessagesText.style.display = 'none';  // Ховаємо повідомлення "немає повідомлень"
        messages.forEach((message) => {
            const newMessageItem = document.createElement("li");
            newMessageItem.innerHTML = `<strong>${message.subject}</strong> від ${message.recipient}`;
            newMessageItem.setAttribute("data-subject", message.subject);
            newMessageItem.setAttribute("data-sender", message.recipient);
            newMessageItem.setAttribute("data-message", message.message);
            newMessageItem.setAttribute("data-signature", message.signature);

            newMessageItem.addEventListener("click", function() {
                openMessageModal(this.getAttribute("data-subject"), this.getAttribute("data-sender"), this.getAttribute("data-message"), this.getAttribute("data-signature"));
            });

            messageList.appendChild(newMessageItem);
        });
    }
}

// Збереження повідомлень у Local Storage
function saveMessage(messageData) {
    const messages = JSON.parse(localStorage.getItem('messages')) || [];
    messages.push(messageData);
    localStorage.setItem('messages', JSON.stringify(messages));
}

// Відправка повідомлення з цифровим підписом
document.getElementById("sendMessageForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const recipient = document.getElementById("recipient").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;


    // Список дозволених доменів
    const allowedDomains = ["@gmail.com", "@lpnu.ua", "@yahoo.com"];
    
    // Функція для перевірки домену
    function isValidEmail(recipient) {
        return allowedDomains.some(domain => recipient.endsWith(domain));
    }

    // Перевірка чи отримувач має допустимий домен
    if (!isValidEmail(recipient)) {
        alert("Будь ласка, введіть правильну адресу електронної пошти, що закінчується на @gmail.com, @lpnu.ua або @yahoo.com.");
        return; // Припиняємо відправку, якщо домен неправильний
    }
    
    // Генерація цифрового підпису
    const signature = await signMessage(message);

    const messageData = {
        recipient: recipient,
        subject: subject,
        message: message,
        signature: signature
    };

    // Збереження повідомлення у Local Storage
    saveMessage(messageData);

    // Оновлення списку повідомлень
    loadMessages();

    // Очищення форми
    document.getElementById("sendMessageForm").reset();
});

// Функція для відкриття модального вікна
function openMessageModal(subject, sender, message, signature) {
    document.getElementById("modalSubject").textContent = subject;
    document.getElementById("modalSender").textContent = `Від: ${sender}`;
    document.getElementById("modalMessage").textContent = message;
    document.getElementById("modalSignature").textContent = `Цифровий підпис: ${signature}`;

    // Перевірка підпису
    verifyMessageSignature(message, signature).then(isValid => {
        document.getElementById("signatureStatus").textContent = isValid ? "Підпис вірний" : "Підпис недійсний";
    });

    document.getElementById("messageModal").style.display = "block";
}// Функція для відкриття модального вікна
function openMessageModal(subject, sender, message, signature) {
    document.getElementById("modalSubject").textContent = subject;
    document.getElementById("modalSender").textContent = `Від: ${sender}`;
    document.getElementById("modalMessage").textContent = message;

    // Обрізуємо підпис до перших 20 символів
    const shortSignature = signature.substring(0, 20) + '...';
    document.getElementById("modalSignature").textContent = `Цифровий підпис: ${shortSignature}`;

    // Перевірка підпису
    verifyMessageSignature(message, signature).then(isValid => {
        document.getElementById("signatureStatus").textContent = isValid ? "Підпис вірний" : "Підпис недійсний";
    });

    document.getElementById("messageModal").style.display = "block";
}

// Закриття модального вікна
document.querySelector(".close").addEventListener("click", function() {
    document.getElementById("messageModal").style.display = "none";
});

// Перевірка цифрового підпису
async function verifyMessageSignature(message, signatureBase64) {
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);

    const signature = new Uint8Array(atob(signatureBase64).split("").map(char => char.charCodeAt(0)));

    return await window.crypto.subtle.verify(
        {
            name: "RSASSA-PKCS1-v1_5",
        },
        publicKey,
        signature,
        encodedMessage
    );
}

// Функція для очищення повідомлень
function clearMessages() {
    // Очищаємо список повідомлень на екрані
    const messageList = document.getElementById("messageList");
    messageList.innerHTML = "";

    // Виводимо повідомлення про відсутність повідомлень
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "Поки що немає повідомлень";
    messageList.appendChild(emptyMessage);

    // Очищення повідомлень із localStorage (якщо використовується)
    localStorage.removeItem('messages');

    // Очищення повідомлень на сервері (якщо використовується сервер)
    fetch('/messages', {
        method: 'DELETE'
    }).then(response => {
        if (response.ok) {
            console.log('Повідомлення очищено.');
        } else {
            console.error('Не вдалося очистити повідомлення.');
        }
    });
}

// Додаємо обробник для кнопки очищення
document.getElementById("clearMessagesButton").addEventListener("click", clearMessages);


// Завантаження повідомлень під час завантаження сторінки
window.onload = loadMessages;