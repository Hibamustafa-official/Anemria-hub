(function () {
  var ME_KEY = 'anemria_me', DB_KEY = 'anemria_community_v1';
  var box = document.getElementById('profileBox');
  var meKey = sessionStorage.getItem(ME_KEY);
  if (!box || !meKey) return;

  var db;
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) {}
  var u = db && db.users && db.users[meKey];
  if (!u) return;

  var av = document.getElementById('hdAv');
  av.textContent = '';
  if (u.dp) {
    var im = document.createElement('img');
    im.src = u.dp; im.alt = '';
    av.appendChild(im);
  } else {
    av.textContent = (u.name || '?').charAt(0).toUpperCase();
  }
  document.getElementById('hdName').textContent = u.name;
  box.hidden = false;
})();