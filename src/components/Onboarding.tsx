import { useState } from 'react'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { AudioButton } from './AudioButton'
import { audioPlayer } from '../services/audio'

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const close = () => { audioPlayer.stop(); onClose() }
  const titles = ['听单词', '选意思', '拼单词']
  const instructions = ['点喇叭可以反复听。', '点选你认为正确的意思。', '逐个输入字母，输错后重新拼写。']
  return <Dialog title="操作示范" onClose={close}>
    <div className="dialog-top"><span className="eyebrow">操作引导 · {step + 1} / 3</span><button className="text-button" onClick={close}>跳过</button></div>
    <div className="onboarding-demo" aria-hidden="true">{step === 0 ? <Icon name="sound" size={64}/> : step === 1 ? '🍎' : <div className="demo-letters"><span>a</span><span>p</span><span>p</span><span>l</span><span>e</span></div>}</div>
    <h2>{titles[step]}</h2><p>{instructions[step]}</p>
    <AudioButton src={`assets/audio/prompt-${['welcome', 'read', 'spell'][step]}.mp3`} label="听说明"/>
    <button className="button primary full" onClick={() => { audioPlayer.stop(); if (step < 2) setStep(step + 1); else close() }}>{step < 2 ? '下一步' : '开始试一试'}<Icon name="arrow"/></button>
  </Dialog>
}
