import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    core.startGroup('Prepare')
    const tag = core.getInput('tag')
    const token = core.getInput('token')
    const octokit = github.getOctokit(token)
    const repository = core.getInput('repository')
    const message = core.getInput('message') || tag
    const sha = core.getInput('sha')
    const qualifiedRepository =
      repository || `${github.context.repo.owner}/${github.context.repo.repo}`
    core.debug(`Repository ${qualifiedRepository}`)
    const splitedRepository = qualifiedRepository.split('/')
    if (splitedRepository.length !== 2) {
      throw new Error(
        "Repository should be provided in syntax of '{owner}/{repo}'"
      )
    }
    const owner = splitedRepository[0]
    const repo = splitedRepository[1]
    const shouldDeleteTag = core.getBooleanInput('delete')
    let foundTagSha = ''
    core.endGroup()
    core.startGroup('Fetch tag if exists')
    try {
      const getTagResponse = await octokit.rest.git.getTag({
        owner,
        repo,
        tag_sha: tag
      })
      foundTagSha = getTagResponse.data.sha
    } catch (e) {
      core.info(`Didn't find tag ${tag}`)
    }
    core.endGroup()

    if (shouldDeleteTag && foundTagSha !== '') {
      core.startGroup('Delete tag')
      core.info(`Deleting ${tag} with sha ${foundTagSha}`)
      const deleteResponse = await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `refs/tags/${tag}`
      })
      core.debug(`Delete status ${deleteResponse.status}`)
      core.endGroup()
    }
    core.startGroup('Create tag')
    const shaToCreateTag = foundTagSha || sha
    const replaceTag = core.getInput('replace_tag')
    const tagToCreate = replaceTag || tag
    await octokit.rest.git.createTag({
      owner,
      repo,
      tag: tagToCreate,
      message,
      object: shaToCreateTag,
      type: 'commit',
      tagger: {
        name: github.context.actor,
        email: `${github.context.actor}@noreply.github.com`
      }
    })

    core.notice(`Created ${tag} at ${shaToCreateTag}`)
    core.endGroup()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
