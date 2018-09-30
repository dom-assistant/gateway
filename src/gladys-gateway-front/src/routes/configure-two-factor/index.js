import { Component } from 'preact';
import Auth from '../../api/Auth';
import ConfigureTwoFactorForm from './ConfigureTwoFactorForm';
import QRCode from 'qrcode';

class ConfigureTwoFactorPage extends Component {
  state = {
    dataUrl: null,
    twoFactorCode: '',
    step: 1,
    errored: false
  };

  getOtpAuthUrl = () => {
    const accessToken = Auth.getAccessToken();
    Auth.configureTwoFactor(accessToken).then(data => {
      QRCode.toDataURL(data.otpauth_url, (err, dataUrl) => {
        this.setState({ dataUrl });
      });
    });
  };

  nextStep = () => {
    this.setState({ step: this.state.step + 1 });
  };

  updateTwoFactorCode = event => {
    let newValue = event.target.value;

    // we add a space between the two group of 3 digits code
    // so it's more readable
    if (newValue.length === 3) {
      if (newValue.length > this.state.twoFactorCode.length) {
        newValue += ' ';
      } else {
        newValue = newValue.substr(0, newValue.length - 1);
      }
    }
    this.setState({ twoFactorCode: newValue });
  };

  enableTwoFactor = (event) => {
    event.preventDefault();
    const accessToken = Auth.getAccessToken();

    let twoFactorCode =  this.state.twoFactorCode.replace(/\s/g, '');

    Auth.enableTwoFactor(accessToken, twoFactorCode)
      .then((data) => {

      })
      .catch((err) => {
        this.setState({ errored: true });
      });
  };

  componentWillMount = () => {
    this.getOtpAuthUrl();
  };

  render({}, { dataUrl, step, twoFactorCode, errored }) {
    return (
      <ConfigureTwoFactorForm
        dataUrl={dataUrl}
        errored={errored}
        nextStep={this.nextStep}
        twoFactorCode={twoFactorCode}
        updateTwoFactorCode={this.updateTwoFactorCode}
        enableTwoFactor={this.enableTwoFactor}
        step={step}
      />
    );
  }
}

export default ConfigureTwoFactorPage;
