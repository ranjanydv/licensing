// Custom JavaScript for Swagger UI
document.addEventListener('DOMContentLoaded', function() {
  // Add a scroll to top button
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '↑';
  scrollBtn.className = 'scroll-top-btn';
  scrollBtn.style.position = 'fixed';
  scrollBtn.style.bottom = '20px';
  scrollBtn.style.right = '20px';
  scrollBtn.style.width = '40px';
  scrollBtn.style.height = '40px';
  scrollBtn.style.borderRadius = '50%';
  scrollBtn.style.backgroundColor = '#1a365d';
  scrollBtn.style.color = 'white';
  scrollBtn.style.border = 'none';
  scrollBtn.style.fontSize = '20px';
  scrollBtn.style.cursor = 'pointer';
  scrollBtn.style.display = 'none';
  scrollBtn.style.zIndex = '1000';
  
  document.body.appendChild(scrollBtn);
  
  // Show/hide scroll button based on scroll position
  window.addEventListener('scroll', function() {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
      scrollBtn.style.display = 'block';
    } else {
      scrollBtn.style.display = 'none';
    }
  });
  
  // Scroll to top when button is clicked
  scrollBtn.addEventListener('click', function() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  });
  
  // Add navigation between API docs and additional documentation
  const navContainer = document.createElement('div');
  navContainer.className = 'doc-navigation';
  navContainer.style.position = 'sticky';
  navContainer.style.top = '0';
  navContainer.style.backgroundColor = '#fff';
  navContainer.style.padding = '10px 0';
  navContainer.style.borderBottom = '1px solid #eee';
  navContainer.style.marginBottom = '20px';
  navContainer.style.zIndex = '100';
  navContainer.style.textAlign = 'center';
  
  const apiBtn = document.createElement('button');
  apiBtn.innerText = 'API Reference';
  apiBtn.style.margin = '0 10px';
  apiBtn.style.padding = '8px 16px';
  apiBtn.style.backgroundColor = '#1a365d';
  apiBtn.style.color = 'white';
  apiBtn.style.border = 'none';
  apiBtn.style.borderRadius = '4px';
  apiBtn.style.cursor = 'pointer';
  
  const docsBtn = document.createElement('button');
  docsBtn.innerText = 'Documentation';
  docsBtn.style.margin = '0 10px';
  docsBtn.style.padding = '8px 16px';
  docsBtn.style.backgroundColor = '#f5f5f5';
  docsBtn.style.color = '#333';
  docsBtn.style.border = 'none';
  docsBtn.style.borderRadius = '4px';
  docsBtn.style.cursor = 'pointer';
  
  navContainer.appendChild(apiBtn);
  navContainer.appendChild(docsBtn);
  
  // Insert navigation after the Swagger UI header
  setTimeout(function() {
    const swaggerUI = document.getElementById('swagger-ui');
    if (swaggerUI) {
      swaggerUI.parentNode.insertBefore(navContainer, swaggerUI.nextSibling);
      
      // Handle navigation clicks
      apiBtn.addEventListener('click', function() {
        document.getElementById('swagger-ui').style.display = 'block';
        document.querySelector('.documentation-container').style.display = 'none';
        apiBtn.style.backgroundColor = '#1a365d';
        apiBtn.style.color = 'white';
        docsBtn.style.backgroundColor = '#f5f5f5';
        docsBtn.style.color = '#333';
      });
      
      docsBtn.addEventListener('click', function() {
        document.getElementById('swagger-ui').style.display = 'none';
        document.querySelector('.documentation-container').style.display = 'block';
        docsBtn.style.backgroundColor = '#1a365d';
        docsBtn.style.color = 'white';
        apiBtn.style.backgroundColor = '#f5f5f5';
        apiBtn.style.color = '#333';
      });
    }
  }, 1000);
});