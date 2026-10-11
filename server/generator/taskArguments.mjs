export function taskArguments(argv) {
  const value = (name) => {
    const prefix = `--${name}=`
    return argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
  }

  return { taskId: value('task-id'), token: value('token') }
}
