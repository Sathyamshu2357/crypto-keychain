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
                this.respond({
                    method: request['method'],
                    values: [node.publicKey.toString('hex')],
                })      
            } else {
                this.reject({
                    id: request['id'],
                })
            }     
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