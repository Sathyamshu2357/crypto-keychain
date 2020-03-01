import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';

class CryptoKeychain extends LitElement {

    static get properties() {
        return {
            dataChannel: { type: RTCDataChannel },
            log: { type: String },
        }
    }
    constructor(){
        super();
        this.log = "";
        let mnemonic = localStorage.getItem('mnemonic')
        if (!mnemonic) {
            mnemonic = bip39.generateMnemonic();
            localStorage.setItem('mnemonic', mnemonic)
        }
        this.rootNode = bip32.fromSeed(bip39.mnemonicToSeedSync(mnemonic))

        this.accounts = localStorage.getItem('accounts') ? JSON.parse(localStorage.getItem('accounts')) : [{index: 0, name: "rootAccount"}]
    }

    render() {
        return html`
            <pre>${this.log}</pre>
        `;
    }
    firstUpdated(changedProperties) {
        super.connectedCallback()
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.addEventListener('message', this.handleIncomingRequest)
        }
    }
    handleIncomingRequest = (msgEvent) => {
        this.log = this.log + `\n${msgEvent.data}`
        const request = JSON.parse(msgEvent.data)
        if (request['method'] === "derivePath") {
            const path = request['params'][0]
            if (confirm(`derivePath: ${path}`)) {
                const node = this.rootNode.derivePath(path)
                const hexPubkey = node.publicKey.toString('hex');
                this.respond(Object.assign(request, {values: [hexPubkey]}))      
            } else {
                this.reject({
                    id: request['id'],
                })
            }     
        } else if (request['method'] === "getAccounts") {
            confirm(`requesting accounts`) && this.respond(Object.assign(request, {values: this.accounts}));
        } else if (request['method'] === "signTx") {
            confirm(`singature request`) && this.respond(Object.assign(request, {values: ["done"]}));
        } else {
            console.log(`unsupported requestMethod: ${request['method']}`)
        }
    }
    respond = (responseObject) => {
        responseObject['status'] = "success";
        this.dataChannel.send(JSON.stringify(responseObject))
    }
    reject = (rejectObject) => {
        rejectObject['status'] = "rejected";
        this.dataChannel.send(JSON.stringify(rejectObject))
    }
}

customElements.define('crypto-keychain', CryptoKeychain);