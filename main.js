async function searchProduct() {
    const productName = document.getElementById('product-name').value;
    const productImage = document.getElementById('product-image').files[0];
    const productInfoDiv = document.getElementById('product-info');

    productInfoDiv.innerHTML = 'Searching...';

    if (productName) {
        // Simulate API call with product name
        setTimeout(() => {
            productInfoDiv.innerHTML = `
                <h3>Product Information for ${productName}</h3>
                <p>Price: $19.99</p>
                <p>Description: This is a great product.</p>
            `;
        }, 1000);
    } else if (productImage) {
        // Simulate API call with product image
        setTimeout(() => {
            productInfoDiv.innerHTML = `
                <h3>Product Information for the uploaded image</h3>
                <p>Price: $29.99</p>
                <p>Description: This is another great product.</p>
            `;
        }, 1000);
    } else {
        productInfoDiv.innerHTML = 'Please enter a product name or upload an image.';
    }
}