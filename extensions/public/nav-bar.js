// extensions/public/nav-bar.js
function loadNavBar() {
  fetch('/nav-bar.html')
    .then(response => response.text())
    .then(html => {
      const navBar = document.createElement('div');
      navBar.innerHTML = html;
      document.body.insertBefore(navBar, document.body.firstChild);
      
      // 高亮当前页面
      highlightCurrentPage();
    })
    .catch(error => {
      console.error('Failed to load nav bar:', error);
    });
}

function highlightCurrentPage() {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll('.nav-bar a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || currentPath.endsWith(href))) {
      link.classList.add('on');
    }
  });
}

// 页面加载完成后加载导航栏
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavBar);
} else {
  loadNavBar();
}
