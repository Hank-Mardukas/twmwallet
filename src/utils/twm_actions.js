const fs = window.require('fs').promises;
const crypto = window.require('crypto');

export async function save_twm_file(filepath, content, password, hash1) {
    try {
        await fs.writeFile(filepath, content);
        console.log(`written to ${filepath}`);

        try {
            let read_check = await fs.readFile(filepath);
            console.log(`read back from ${filepath} and now confirming hashes`);

            const algorithm = 'aes-256-ctr';

            const decipher = crypto.createDecipher(algorithm, password);
            let dec = decipher.update(read_check.toString(), 'hex', 'utf8');
            dec += decipher.final('utf8');

            const hash2 = crypto.createHash('sha256');
            hash2.update(dec);

            let hash_two = hash2.digest('hex');

            if (hash_two === hash1) {
                console.log(`all good hashes confirmed`);
                return {success: `saved file to ${filepath}`}
            } else {
                return {error: `fatal error saving to ${filepath}, ${hash_two}, does not match supplied ${hash1}`}
            }
        } catch (err) {
            console.log(err);
            return {error: `error reading back the file for error checking save is unverified`};
        }
    } catch (err) {
        console.error(err);
        return {error: `error writing file ${filepath}`};
    }
};


export async function open_twm_file(filepath, password) {
    try {
        let twm_file = await fs.readFile(filepath);
        const algorithm = 'aes-256-ctr';

        const decipher = crypto.createDecipher(algorithm, password);
        let dec = decipher.update(twm_file.toString(), 'hex', 'utf8');
        dec += decipher.final('utf8');

        try {
            let dec_json = JSON.parse(dec);

            if (dec_json.version > 0) {

                return {success: `success opening wallet file`, contents: dec_json};
            } else {
                return {error: `potential error decrypting, version not found, perhaps wrong password.`, contents: dec};
            }
        } catch(err) {
            console.error(err);
            return {error: `error parsing json formatting from encrypted file, perhaps wrong password supplied`, contents: dec};
        }
    } catch (err) {
        console.error(err);
        return {error: `error reading file ${filepath}`};
    }
};



/*
export async function create_twm_file(filepath) {
    try {
        let exists = await fs.access(filepath);
        if (exists) {
            return true;
        } else {
            try {
                let make = await fs.open(filepath);
                if (make) {
                    console.log(make);
                    return true;
                } else {
                    console.log(make);
                    return false;
                }
            } catch (err) {
                console.error(err);
                return false;
            }
        }
    } catch (err) {
        console.error(err);
    }
};*/



/*
 try {
            let made = await create_twm_file('/home/dally/2020/tttt.twm');
            console.log(`made ${made}`);
        } catch(err) {
            console.error(err);
            console.error(`error at making the file`);
        }

 */