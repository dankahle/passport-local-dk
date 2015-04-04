
# passport-local-dk
 
 This is my take on a passport-local solution using angular for the login/register pages, as the web egs all seem to be in love with serverside views. The serverside view would stick login errors in the session (flashes) and pull them out on the redirect back to login. I needed to do the equivalent with angular pages using xhr, not terribly difficult, but does force you to hook into the passport.authorize() to get the verbose messages back, if you don't you'll get the generic messages back (400/bad request, 401/unauthorized), which you may very well want, but I figure if you want to deter hackers/computers, then some logic that would shut down login for 5 minutes after 5 failures or so. 
 
 Theres' multiple projects here:
 
 * loginRollYourOwn:  is my attempt at doing it without passport, as passport doesn't really do anything, it's so plugin ready, that all the code is written by you. This greatly simplified things.
 
 * loginRollYourOwnMongoose: here I utilized passport-local-mongoose to roll my own with a db and hashing the pword. This is more realistic and still simplified
  
  * login: a simple passport-local solution with faked dataabse and no pword hashing
  
  * loginMongoose: finally a realistic solution using passport, a database and pword hashing.
  
  