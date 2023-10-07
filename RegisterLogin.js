class RegisterPlugin {
    constructor(loginTime) {
        this.players = this.loadLocalData() // Hold real permanent information
        this.tempList = new Array(); // Holds temporary information
        this.activeAuths = new Set(); // Active auths in the game (no duplicates allowed)
        this.activeNames = new Set(); // Active logged-in names in the game. Unregistered names are also logged in (no duplicates allowed)
        this.forceRegister = false; // Let's you force new players to register.
        this.forceLogin = true; // WIP - Not useful
        let that = this
        this.autoSaver = setInterval( function() {
            that.saveLocalData()
        }, 900000)
        if (loginTime == undefined) this.loginTime = loginTime*1000 // Defines the maximum log-in time allowed for a registed not logged-in player
        else this.loginTime = 30000 // Default time    
    }
    register(name, auth, password, score, id) {
        // Registers the player to the permanent list. Stores name, auth, password and anything you want!
        let playerObject = {
            id: id,
            name: name,
            auth: auth,
            password: password,
            score: score // You can put anything you want to store in score!
        }
        this.tempList[id].registered = true
        this.tempList[id].loggedIn = true
        this.players.push(playerObject)
        room.sendAnnouncement("Başarılı bir şekilde kaydoldunuz! Kullanıcı adı: " + name + " - Bu kullanıcı adını kullanarak istediğiniz yerden şifrenizle giriş yapabilirsiniz.", id, "0X00FF00", "bold", 2)
    }

    detect(id, name, auth) {
        // Detects the status of a newly joining player. This function must be called in onPlayerJoin function
        // Object.detect(player.id, player.name, player.auth)
        //
        this.tempList[id] = {
            id: id,
            name: name,
            auth: auth,
            registered: false,
            loggedIn: false,
            warned: 0,
            timer: false,
        }
        if (auth == undefined) {
            // Protection against server breaking bugs
            room.kickPlayer(id, "Kullanıcı bilgisi alınamadı!", false)
            return
        }
        else if (this.activeAuths.has(auth) || this.activeNames.has(name)) {
            // Kick duplicates
            room.kickPlayer(id, "Kullanıcı zaten oyunda!", false)
            return
        }
        else {
            // Add auth to the list. Same auth can't join with a second account while this player is still in the game
        }

        let authCheck = this.players.findIndex(p => p.auth == auth)
        if (authCheck == -1) {
            // Registered auth not found.
            let nameCheck = this.players.findIndex(p => p.name == name)
            if (nameCheck == -1) {
                // Registered name not found.
                // Not registered player, ask for registering
                this.activeNames.add(name)
                this.activeAuths.add(auth)
                this.tempList[id].loggedIn = true
                this.askRegister(id)
                return false
            }
            else {
                // Auth not found. Name was found. Ask for password.
                this.askPassword(id)
                this.tempList[id].registered = true
                let target = id
                let that = this
                this.tempList[id].timer = setTimeout( function() {
                    if (that.tempList[target].loggedIn == false) {
                        room.kickPlayer(target, "Giriş yapmadınız.", false)
                    }
                }, this.loginTime)
                return false
            }
        }
        else {
            // Found registered auth! Checking if username is available
            if (this.validateAuthName(id, name, auth)) {
                // This name is safe to use.
                this.tempList[id].loggedIn = true
                this.login(id, auth, name, true)
                return true
            } 
            else {
                // Name is already in use and this auth use this name!
                room.sendAnnouncement("Bu ad zaten kullanılıyor! Lütfen başka isimle geliniz.", id, "0XFFFF00", "bold", 2)
                let kickTimeout = setTimeout(function() {
                    room.kickPlayer(id, "Bu ad zaten kullanılıyor!", false)
                }, 2000)
                return false
            }
        }
    }

    login(id, auth, name, password) {
        if (password === true) {
            // This represents fast auth login.
            let targetPlayer = this.players.find(p => p.auth == auth)
            room.sendAnnouncement("Hızlı giriş başarılı! İyi oyunlar.", id, "0X00FF00", "bold", 2)
            this.activeNames.add(name)
            this.activeAuths.add(auth)
            this.duplicateCheck(id, targetPlayer)
            return true
        }
        let targetPlayer = this.players.find(p => p.name == name) 
        // Finds target name's information to login
        if (targetPlayer != undefined) {
            // Double-checking just in case of a mistake
            if (password == targetPlayer.password) {
                // Password is correct! Log in is succesful.
                // Updated auth information of this username in the permanent storage
                targetPlayer.auth = auth
                this.tempList[id].loggedIn = true
                this.activeNames.add(targetPlayer.name)
                this.activeAuths.add(auth)
                // Checks the other duplicates trying to log in.
                // When logged in, it kicks all the other duplicates trying to log in
                this.duplicateCheck(id, targetPlayer)
                room.sendAnnouncement("Başarılı bir şekilde giriş yaptınız! Hızlı giriş bilgileri güncellendi.", id, "0X00FF00", "bold", 2)        
                return true
            }
            else {
                // Password is wrong
                this.wrongPassword(id)
                return false
            }
        } 
        else {
            // This shouldn't happen but, just in case... Kick the player with error message
            room.kickPlayer(id, "Bir hata oluştu. Lütfen tekrar deneyiniz.", false)
            return false
        }
    }

    askRegister(id) {
        if (this.forceRegister) {
            // Registeration is forced!
            room.sendAnnouncement("Lütfen '!kaydol <şifre>' komutunu kullanarak kayıt olunuz. Bu odada kayıt olmak zorunludur.", id, "0XFFFF00", "bold", 2)
        }
        else {
            room.sendAnnouncement("Bilgileriniz kayıtlı kalması için '!kaydol <şifre>' komutu ile kaydolabilirsiniz.", id, "0X00FF00", "bold", 2)
        }
    }

    askPassword(id) {
        if (this.forceLogin) {
            room.sendAnnouncement("Kayıtlı bir hesapla giriş yaptınız. Lütfen '!giriş <şifre>' komutuyla giriş yapınız.", id, "0XFFFF00", "bold", 2)
        }
    }

    wrongPassword(id) {
        // Warns the player on wrong password. On 3rd warn, it kicks the player
        this.tempList[id].warned++
        if (this.tempList[id].warned > 2) {
            room.kickPlayer(id, "Fazla sayıda hatalı giriş!", false)
            return false
        }
        room.sendAnnouncement("Hatalı giriş yaptınız! Lütfen tekrar deneyin.", id, "0XFFFF00", "bold", 2)
    }

    msgCheck(id, msg) {
        //
        // Checks the player messages for register/login purposes and blocks the messages of not logged in players
        // This function must be called in onPlayerChat section.
        // Object.msgCheck(player.id, message)
        //
        if (msg.startsWith("!gir")) {
            // Checks if the message starts with log in command
            if (this.tempList[id].registered == true) {
                // Player is registered
                if (this.tempList[id].loggedIn == false) {
                    // Player is not logged in
                    let tName = this.tempList[id].name
                    let tAuth = this.tempList[id].auth
                    let pass = this.getPassword(msg)
                    // Check the password
                    if (pass == false) {
                        // 'false' means either wrong password or mistakenly used command
                        this.wrongPassword(id)
                    }  
                    else {
                        // Tries to log in with the given password
                        this.login(id, tAuth, tName, pass)
                    }
                }
                else {
                    // Already logged in!
                    room.sendAnnouncement("Zaten giriş yaptınız!", id, "0X00FF00", "small-bold", 0)
                }
            }
            else {
                // Not registed player trying to log in.
                room.sendAnnouncement("Giriş yapabilmek için önce kayıt olmanız lazım! Eğer zaten kayıtlı bir kullanıcıysanız lütfen kayıt olduğunuz isimle sunucumuza geliniz.", id, "0XFFFF00", "bold", 2)
            }
        return true
        }
        else if (msg.startsWith("!kay")) {
             // Checks if the message starts with register command
            if (this.tempList[id].registered) {
                // Already registered, you can't register
                room.sendAnnouncement("Bu isimle zaten kayıtlı bir oyuncu mevcut! Giriş yapmak için '!giriş <şifre>' yazmanız yeterli. Hesap size ait değilse lütfen çıkış yapınız.", id, "0XFFFF00", "bold", 2)
            }
            else {
                // Not registered.
                let pass = this.getPassword(msg)
                if (this.getPassword(msg) != false) {
                    // Registers the player succesfully
                    let tName = this.tempList[id].name
                    let tAuth = this.tempList[id].auth
                    let tScore = this.tempList[id].score
                    this.register(tName, tAuth, pass, tScore, id)
                }
                else {
                    // Mistakenly used command
                    room.sendAnnouncement("Hatalı bir şekilde şifre yazdınız! Lütfen '!kayıt <şifre>' şeklinde şifrenizi giriniz.", id, "0XFFFF00", "bold", 2)
                }
            }
        return true // return true to hide the message in chat
        }
        else if (this.tempList[id].registered == true && this.tempList[id].loggedIn == false) {
            // Registered but not logged in player trying to type anything...
            room.sendAnnouncement("Lütfen '!giriş <şifre>' ile giriş yapınız!", id, "0XFFFF00", "small-bold", 0)
            return true // return true to hide the message in chat
        }
    }
    getPassword(pass) {
        // Gets the password from chat message. Password must be 1 word and first word must be '!kayıt' or '!giriş'
        // example: '!kayıt myPassword', '!giriş ohYes'
        //
        let splice = pass.split(" ")
        if (splice.length == 2) {
            return splice[1]
        }
        else return false
    }
    validateAuthName(id, name, auth) {
        // Checks if the fast auth login tries to claim another users name
        // This allows to prevent registered players using other registered player's name
        let nameOwner = this.players.find(q => q.auth == auth)
        if (nameOwner.auth == auth) return true
        else return false
    }
    duplicateCheck(id, targetPlayer) {
        // Checks if there are duplicate players with the same name, used after logging in
        // Useful when there are multiple accounts trying log in in the same time
        let checkers = room.getPlayerList().filter( q => q.name == targetPlayer.name)
                if (checkers.length > 0) {
                    let duplicates = checkers.filter( o => o.id != id)
                    for (let i=0; i<duplicates.length; i++) {
                        room.kickPlayer(duplicates[i].id, "Başka bir yerden giriş yapıldı!", false)
                    }
                }
    }

    leaveCheck(id) {
        // MUST HAVE FUNCTION!
        // This function must be called in onPlayerLeave function
        // Checks the leaving player. Frees the auth and the name
        //
        if (this.tempList[id].loggedIn) {
        this.activeAuths.delete(this.tempList[id].auth)
        this.activeNames.delete(this.tempList[id].name)
        this.tempList[id].loggedIn = false
        }
    }
    loadLocalData() {
        let data = localStorage.getItem("HaxReg")
        if (data != null) {
            console.log("HaxReg V1.0: Local data loaded succesfully!")
            return JSON.parse(data)
        }
        else {
            console.log("HaxReg V1.0: No saved data was found.")
            return new Array()
        }
    }
    saveLocalData() {
        let info = this.players
        if (info != undefined) {
            let data = JSON.stringify(info)
            localStorage.setItem("HaxReg", data)
            console.log("HaxReg V1.0: Local data saved succesfully!")
            return true
        }
        else {
            console.log("HaxReg V1.0: Save was failed. Data was not available.")
            return false
        }
    }
    shutdown() {
        room.setPassword(Math.random().toString())
        let players = room.getPlayerList()
        for (let i = 0; i< players.length; i++) {
            room.kickPlayer(players[i].id, "Oda kapanıyor, iyi günler dileriz", false)
        }
        clearInterval(this.autoSaver)
        this.saveLocalData()
        room = undefined
        console.log("HaxReg V1.0: Room shutdown! You can close the tab after a succesful save.")
    }

}

/*
#######################
#### EXAMPLE USAGE ####
#######################

HaxReg = new RegisterPlugin(10)

room.onPlayerJoin = function(player) {
    HaxReg.detect(player.id, player.name, player.auth)
}

room.onPlayerChat = function(player, message) {
    if (HaxReg.msgCheck(player.id, message)) return false
}

room.onPlayerLeave = function(player) {
    HaxReg.leaveCheck(player.id)
}







 */