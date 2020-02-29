import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
const purpose = "44'"  // BIP-44
const coin = "0'"  // bitcoin
const account = "0'"
const change = 0    // 0 - normal address chain | 1 - change address chain
const index = 0 // address Index
class BitcoinWallet extends LitElement {
    static get properties() {
        return {
            dataChannel: { type: RTCDataChannel },
            log: { type: String },
            address: { type: String },
        }
    }
    constructor(){
        super();
        this.log = "";
        this.address = "";
    }
    render() {
        return html`
            <h4>Bitcoin Wallet:</h4>
            <button @click=${this.requestAddress}>Get Address</button><div>${this.address}</div>
            <pre>${this.log}</pre>
        `;
    }  
    firstUpdated(changedProperties) {
        super.connectedCallback()
        // create/accept offer
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.addEventListener('message', this.handleIncomingResponse);
        }
    }
    requestAddress = () => {
        this.request("derivePath", [`m/${purpose}/${coin}/${account}/${change}/${index}`])
    }
    handleIncomingResponse = (msgEvent) => {
        this.log = this.log + `\n${msgEvent.data}`
        const response = JSON.parse(msgEvent.data)
        if (response['status'] === "success" && response['method'] === "derivePath") {
            const hexPubkey = response['values'][0]
            this.address = bitcoin.payments.p2pkh({ pubkey: Buffer.from(hexPubkey, 'hex') }).address
        }
    }
    request = (requestMethod, params) => {
        this.dataChannel.send(JSON.stringify({
            id: 0,
            method: requestMethod,
            params: params,
        }))
    }
}
customElements.define('bitcoin-wallet', BitcoinWallet);