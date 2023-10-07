# HaxReg
An easy to use, localStorage based Register/Login plugin for HaxBall!

This plugin allows you to:

- Register an account with nickname/password

- Store any data to registered accounts

- Quick login with auth check!


# How to use?
1-) Add the RegisterPlugin class in your code.

2-) Create your register plugin with any name you want. ex: HaxReg = new RegisterPlugin(true)

3-) Add .detect function to the room.onPlayerJoin section of your code as shown in the comment example.

4-) Add .msgCheck function to the room.onPlayerChat section of your code as shown in the comment example.

5-) Add .leaveCheck function to the room.onPlayerLeave section of your code as shown in the comment example.


After following the steps, you're ready to use it!

Note: This plugin in still work in progress!
