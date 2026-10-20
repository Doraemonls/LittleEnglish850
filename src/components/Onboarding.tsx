import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { AudioButton } from './AudioButton'
import { audioPlayer } from '../services/audio'

export function Onboarding({ onClose, language = 'zh-CN' }: { onClose: () => void; language?: 'zh-CN' | 'en' }) {
  const close = () => { audioPlayer.stop(); onClose() }
  const english = language === 'en'
  return <Dialog title={english ? 'Parent guide' : '家长使用说明'} onClose={close}>
    <div className="dialog-top"><span className="eyebrow">{english ? 'Optional help' : '可选说明'}</span><button className="icon-button" aria-label={english ? 'Close guide' : '关闭说明'} onClick={close}><Icon name="close"/></button></div>
    <div className="onboarding-demo" aria-hidden="true"><Icon name="sound" size={54}/><span>→</span><Icon name="check" size={54}/></div>
    <h2>{english ? 'Listen, answer, and keep going' : '听一听，答一答，自动继续'}</h2>
    <p>{english ? 'Listening and spelling audio starts automatically. Correct quiz answers move on after a short pause, while progress is saved in this browser.' : '听音和拼写会自动播放单词；答对后稍作停留并自动进入下一题。学习进度保存在当前浏览器。'}</p>
    <AudioButton src="assets/audio/prompt-welcome.mp3" label={english ? 'Listen to instructions' : '听说明'} language={language}/>
    <button className="button primary full" onClick={close}>{english ? 'Got it' : '知道了'}<Icon name="check"/></button>
  </Dialog>
}
