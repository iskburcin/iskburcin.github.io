function $(elem, from = document) {
    return from.querySelector(elem);
}

document.addEventListener('mousemove', function (event) {
    const leftLink = $('#left-link');
    const rightLink = $('#right-link');

    if (event.clientX <= 50) {
        leftLink.classList.remove('hidden');
        leftLink.style.transform = 'translateX(0)';
    } else {
        leftLink.style.transform = 'translateX(-100%)';
        setTimeout(() => leftLink.classList.add('hidden'), 300);
    }

    if (event.clientX >= window.innerWidth - 50) {
        rightLink.classList.remove('hidden');
        rightLink.style.transform = 'translateX(0)';
    } else {
        rightLink.style.transform = 'translateX(100%)';
        setTimeout(() => rightLink.classList.add('hidden'), 300);
    }
});
