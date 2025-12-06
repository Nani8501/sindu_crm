// Accordion toggle function for conversation grouping
window.toggleConversationAccordion = function (categoryId) {
    const content = document.getElementById(`accordion-${categoryId}`);
    const icon = document.getElementById(`icon-${categoryId}`);

    if (content && icon) {
        content.classList.toggle('active');
        icon.classList.toggle('rotated');
    }
};
