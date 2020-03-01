import {LitElement, html} from 'https://unpkg.com/lit-element/lit-element.js?module';
import "../common/webrtc-connector.js";
import "../common/webrtc-messenger.js";
class TransactionPage extends LitElement {
    static get properties() {
        return {
            accounts: { type: Array },
            connected: { type: Boolean },
        }
    }
    constructor(){
        super();
        this.connected = false;
        this.accounts = [{index: 0, name: "fetching accounts..."}]
        const searchParams = new URL(window.location.href).searchParams
        this.currency = searchParams.get('currency')
        this.toAddress = searchParams.get('toAddress')
        this.value = searchParams.get('value')
        this.channelId = searchParams.get('channelId')
        this.channel = new BroadcastChannel(this.channelId)
    }
    render() {
        return html`
            <h2>Transaction Page (completely open-source)</h2>
            scan the QR with your keychain
            <br><br>
            <webrtc-connector
                .offerer=${true}
                @connected=${this.handleConnectionEvent}
            ></webrtc-connector>

            <div style="display:${this.connected ? "block": "none"}">
                You are willing to send ${this.value} ${this.currency} to ${this.toAddress} from your account 
                <select id="accountSelection">
                    ${this.accounts.map((account) => html`<option value=${account.index}>${account.name}</option>`)}
                </select>
                <br>
                <button @click=${this.handleProceed}>Proceed</button>
            </div>
        `;
    }  
    handleConnectionEvent = async (event) => {
        this.connected = true;
        this.dataChannel = event.detail.dataChannel;
        this.accounts = await this.requestAccounts();
        console.log(accounts);
    }
    requestAccounts = async () => {
        return new Promise((resolve, reject) => {
            this.dataChannel.addEventListener('message', (msgEvent) => {
                const message = JSON.parse(msgEvent.data)
                if (message['status'] === "success" && message['method'] === "getAccounts") {
                    resolve(message['values'])
                }
            })
            this.dataChannel.send(JSON.stringify({
                id: "transaction-0",
                method: "getAccounts", 
                params: [],
            }))
        })
    }
    handleProceed = async (event) => {
        const signedTx = await this.requestTxSignature();
        console.log("singedTx", signedTx);
        this.channel.postMessage("initiated")
        window.close();
    }
    requestTxSignature = async () => {
        const tx = {
            toAddress: this.toAddress,
            value: this.value,
            currency: this.currency,
            accountIndex: this.shadowRoot.getElementById("accountSelection").value,
        };
        return new Promise((resolve, reject) => {
            this.dataChannel.addEventListener('message', (msgEvent) => {
                const message = JSON.parse(msgEvent.data)
                if (message['status'] === "success" && message['method'] === "signTx") {
                    resolve(message['values'][0])
                }
            })
            this.dataChannel.send(JSON.stringify({
                id: "transaction-1",
                method: "signTx", 
                params: [tx],
            }))
        })
    }

}
customElements.define('transaction-page', TransactionPage);