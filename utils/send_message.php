<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect and sanitize form data
    $email = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);
    $subject = htmlspecialchars(trim($_POST['subject']));
    $message = htmlspecialchars(trim($_POST['message']));

    // Validate input data
    if (!empty($email) && !empty($subject) && !empty($message)) {
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $to = "burcinisik1503@gmail.com";
            $subject = "New message from: $subject";
            $body = "
                Email: $email\n
                Subject: $subject\n
                Message: \n$message
            ";
            $headers = "From: $email";

            // Send the email
            if (mail($to, $subject, $body, $headers)) {
                echo "Message sent successfully!";
            } else {
                echo "Failed to send message.";
            }
        } else {
            echo "Invalid email format.";
        }
    } else {
        echo "Please fill in all fields.";
    }
}
?>
