(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let currentData = null

  const updateProcessing = (status) => {
    processing = status
    refreshResultsAndFooter()
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    assessmentOptions = dataWithoutState.options

    render()
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    refreshResultsAndFooter()
  }

  const onGrade = (event) => {
    event.preventDefault()
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const updateFooterButtons = () => {
    const gradeVisibility = assessmentOptions.showAsTeacher && !assessmentOptions.owner
    updateVisibility($('.grade-button'), gradeVisibility)
  }

  const renderInfoBlock = () => {
    const answered = result?.points !== undefined
    const {result} = currentData || {}
    const infoBlock = $('.codio-assessment-info-block')
    infoBlock.addClass('hide')
    infoBlock.empty()
    if (!answered || assessmentOptions.showAsTeacher || assessment.source.points === 0) {
      return
    }
    const text = `<strong>Score :</strong> ${result.points} out of ${assessment.source.points}`
    infoBlock.html(text)
    infoBlock.removeClass('hide')
  }

  const renderTeacherComment = () => {
    // todo render comment
  }

  const refreshResultsAndFooter = () => {
    if (!assessment) {
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
    if (!assessmentOptions.showAsTeacher && !answered) {
      return
    }
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
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
      }
    } catch {}
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
