function showCategory(category) {
    // Hide all categories
    const categories = document.querySelectorAll('.category-content');
    categories.forEach((cat) => {
        cat.style.display = 'none';
    });

    // Show the selected category
    const selectedCategory = document.getElementById(category);
    if (selectedCategory) {
        selectedCategory.style.display = 'block';
    }
}