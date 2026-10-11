import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { SpriteLoader } from './features/editor/SpriteLoader'
import { captureInviteToken } from './features/task/taskApi'
import { CharacterPage } from './pages/CharacterPage'
import { ConfirmPage } from './pages/ConfirmPage'
import { GeneratingPage } from './pages/GeneratingPage'
import { ResultPage } from './pages/ResultPage'
import { LandingPage, UploadPage } from './pages/UploadPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  useEffect(() => {
    captureInviteToken()
  }, [])

  return (
    <>
      {/* 素材雪碧图必须内联注入，<use href="#sc-xxx"> 才能解析 */}
      <SpriteLoader />
      <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<UploadPage />} path="/upload" />
        <Route element={<GeneratingPage />} path="/generating/:taskId" />
        <Route element={<ConfirmPage />} path="/confirm/:taskId" />
        <Route element={<CharacterPage />} path="/characters/:taskId" />
        <Route element={<WorkspacePage />} path="/workspace/:taskId" />
        <Route element={<ResultPage />} path="/result/:taskId" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </>
  )
}
