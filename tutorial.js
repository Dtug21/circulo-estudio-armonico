const params=new URLSearchParams(location.search);
const key=params.get('key'),mode=params.get('mode');
const validKeys=['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'];
if(validKeys.includes(key)&&(mode==='major'||mode==='minor')){
  const query=new URLSearchParams({key,mode});
  document.querySelectorAll('[data-page-link]').forEach(link=>{link.href=`${link.dataset.pageLink}?${query}`});
}
