import Saga from './core';
import config from './config';
import ram from 'random-access-memory';
import swarm from '@geut/discovery-swarm-webrtc';
import signalhub from 'signalhubws';

// P2P DEFAULTS
const webrtcOpts = {
  config: {
    iceServers: (process.env.ICE_URLS || config.ICE_URLS).split(';').map(data => {
      const [urls, credential, username] = data.split(',')

      if (credential && username) {
        return {
          urls,
          credential,
          username
        }
      }

      return { urls }
    })
  }
};
// END P2P DEFAULTS

const initComm = async (username, key) => {
  const publicKey = key && key.length > 0 ? key : null;
  const saga = Saga(ram, publicKey, username);

  await saga.initialize();

  const sw = swarm({
    id: username,
    stream: () => {
      return saga.replicate()
    }
  });


  const discoveryKey = saga.db.discoveryKey.toString('hex');
  const signalUrls = (process.env.SIGNAL_URLS || config.SIGNAL_URLS).split(';');
  sw.join(signalhub(discoveryKey, signalUrls), webrtcOpts);

  sw.on('connection', async peer => {
    try {
      await saga.connect(peer);
    } catch (err) {
      console.log(err);
    }
  })

  return saga;
}

export default initComm;