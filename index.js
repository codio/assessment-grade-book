(function (){
  let processing = false
  let currentData = null

  const taskId = location.hash.substring(1)

  const updateProcessing = (status) => {
    processing = status
    refreshResultsAndFooter()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    if (currentData === null) {
      currentData = data
      render()
      return
    }
    currentData = data
    refreshResultsAndFooter()
  }

  const onGrade = (event) => {
    event.preventDefault()
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GRADE)
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const updateFooterButtons = () => {
    const gradeVisibility = currentData.options.showAsTeacher && !currentData.options.owner
    updateVisibility($('.grade-button'), gradeVisibility)
  }

  const renderInfoBlock = () => {
    const {result} = currentData || {}
    const answered = result?.points !== undefined
    const infoBlock = $('.codio-assessment-info-block')
    infoBlock.addClass('hide')
    infoBlock.empty()
    if (!answered || currentData.options.showAsTeacher || currentData.assessment.source.points === 0) {
      return
    }
    const text = `<strong>Score :</strong> ${result.points} out of ${currentData.assessment.source.points}`
    infoBlock.html(text)
    infoBlock.removeClass('hide')
  }

  const renderMd = async (container, value) => {
    try {
      const file = await window.unified()
        .use(window.remarkParse)
        .use(window.remarkHtml)
        .process(value)
      container.html(file.value)
    } catch (err) {
      console.error(err)
      return container.html('Error parsing markdown value')
    }
  }

  const renderRubricItem = (weight, message) => {
    const container = $('<div class="codio-assessment-rubric-item"></div>')
    const numClassSuffix = weight > 0 ? 'plus' : 'minus'
    const numPrefix = weight > 0 ? '+' : ''
    const numContainer = $(
      `<div class="codio-assessment-rubric-item-num-${numClassSuffix}">${numPrefix}${weight}</div>`
    )
    container.append(numContainer)
    const messageContainer = $('<div class="codio-assessment-rubric-item-message"></div>')
    renderMd(messageContainer, message)
    container.append(messageContainer)
    return container
  }

  const renderRubrics = (container, assessmentRubrics, assignmentRubrics) => {
    const assignmentRubricsMap = {}
    assignmentRubrics.rubricsList.forEach(rubric => {
      assignmentRubricsMap[rubric.uuid] = rubric
    })

    const items = (assessmentRubrics?.rubrics ?? []).filter(rubricId => {
      const rubricItem = assignmentRubricsMap[rubricId]
      const {correctId, incorrectId} = assignmentRubrics
      return rubricItem && rubricItem.uuid !== correctId && rubricItem.uuid !== incorrectId
    }).sort((a, b) => {
      const indexA = assignmentRubrics.rubricsList.findIndex(item => item.uuid === a)
      const indexB = assignmentRubrics.rubricsList.findIndex(item => item.uuid === b)
      return indexA - indexB
    })

    if (!assessmentRubrics.comments && !assignmentRubrics.adjustValue && items.length === 0) {
      return
    }

    container.append('<div class="codio-assessment-rubrics-title">Grade details:</div>')
    const rubricsInfoContainer = $('<div class="codio-assessment-rubrics-info"></div>')
    if (assessmentRubrics.comments) {
      const commentsContainer = $('<div class="codio-assessment-rubrics-comments"></div>')
      renderMd(commentsContainer, assessmentRubrics.comments)
      rubricsInfoContainer.append(commentsContainer)
    }
    items.forEach((id) => {
      const rubricItem = assignmentRubricsMap[id]
      rubricsInfoContainer.append(renderRubricItem(-rubricItem.weight, rubricItem.message))
    })
    if (assessmentRubrics.adjustValue) {
      rubricsInfoContainer.append(renderRubricItem(assessmentRubrics.adjustValue, 'Points adjust'))
    }
    container.append(rubricsInfoContainer)
  }

  const renderTeacherComment = () => {
    const commentBlockTop = $('.codio-assessment-teacher-comment-block-top')
    const commentBlockBottom = $('.codio-assessment-teacher-comment-block-bottom')
    commentBlockTop.addClass('hide')
    commentBlockTop.empty()
    commentBlockBottom.addClass('hide')
    commentBlockBottom.empty()

    const {eduStartedAssignment, assignmentRubrics, showAsTeacher} = currentData.options

    const container = showAsTeacher ? commentBlockTop : commentBlockBottom

    const rubrics = eduStartedAssignment?.started?.rubrics
    const assessmentRubrics = rubrics ? rubrics[taskId] : null
    if (!assessmentRubrics) {
      return null
    }
    renderRubrics(container, assessmentRubrics, assignmentRubrics)
    container.removeClass('hide')
  }

  const refreshResultsAndFooter = () => {
    if (!currentData?.assessment) {
      return
    }
    renderInfoBlock()
    renderTeacherComment()
    updateFooterButtons()
  }

  const bindEvents = () => {
    $('.grade-button').on('click', onGrade)
    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const {result} = currentData || {}
    const answered = result?.points !== undefined
    if (!currentData.options.showAsTeacher && !answered) {
      return
    }
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    currentData.assessment.source.showName ? nameEl.text(currentData.assessment.source.name) : nameEl.remove()
    refreshResultsAndFooter()
    bindEvents()
    container.removeClass('hide')
  }

  const processMessage = (jsonData) => {
    try {
      const {method, data} = JSON.parse(jsonData)
      console.log('assessment iframe processMessage', jsonData, method, data)
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.GET_STYLES_RESPONSE:
          window.codioAssessmentsHelper.addStyle(data.css)
          break
        case window.codioAssessmentsHelper.METHODS.GET_STATE_RESPONSE:
          updateProcessing(false)
          applyState(data)
          break
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
        case window.codioAssessmentsHelper.METHODS.GRADE_CLOSED: {
          setTimeout(() => {
            $('.grade-button')[0].focus()
          }, 1000)
          break
        }
      }
    } catch {}
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
