document.getElementById('login-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.target.querySelector('button'),status=document.getElementById('login-status');button.disabled=true;status.textContent='Signing in…';
 try{const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})});const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to sign in.');location.replace('/');}catch(error){status.textContent=error.message;button.disabled=false;}
});
