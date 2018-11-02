// Create necessary references to elements
const main = document.querySelector('main')
const form = document.querySelector('form')
const nameInput = document.getElementById('inputTaskName')
const descriptionInput = document.getElementById('inputTaskDescription')
const inputDivider = document.getElementById('inputDivider')
const completeDivider = document.getElementById('completeDivider')

// Display helper functions

function createMessage (cls, message) { // creates a text message marked as given class
    let msg = document.createElement('p')
    msg.className = cls
    msg.innerHTML = message
    return msg
}

function modifyButton (button, tooltip, onclickFunc, cls) { // modifies a button's onclick and class properties
    button.title = tooltip
    button.onclick = onclickFunc
    button.className = cls
}

function createButton (title, onclickFunc, cls) { // creates a button marked as given class, with text label and linked onclick function
    let button = document.createElement('button')
    modifyButton(button, title, onclickFunc, cls)
    return button
}

function createInputField (cls, init_value) { // creates an input field marked as given class, with given initial value
    let input = document.createElement('input')
    input.type = 'text'
    input.className = cls
    input.value = init_value
    input.disabled = true
    return input
}

function getTaskInfo (eve) { // get associated task div and its id from triggering event
    let task = eve.target.parentNode
    let taskId = Number(task.getAttribute('task-id'))
    return [task, taskId]
}

function checkAddEmptyMessage () { // check if no pending tasks and no message if so add nothing to do message
    let msg = document.querySelector('p.emptymsg')
    if(document.querySelectorAll('div.taskToDo').length === 0 & msg === null) {
        msg = createMessage('emptymsg', 'Twiddling my thumbs, nothing to do.')
        main.insertBefore(msg, completeDivider)
    }
}    

function checkDelEmptyMessage () { // if empty message exists, remove it
    let msg = document.querySelector('p.emptymsg')
    if ( msg !== null ) {
        main.removeChild(msg)
    }
}

// Database helper functions

function openRWTransaction (db) { // opens a read-write transaction with db
    let transaction = db.transaction(['tasks'], 'readwrite')
    let objectStore = transaction.objectStore('tasks')
    return [transaction, objectStore]
}

function getTaskData (db, taskId) { // retrieves data corresponding to task id
    let objectStore = openRWTransaction(db)[1]
    let request = objectStore.get(taskId)
    return [objectStore, request]
}

function storeTaskData (eve, objectStore, field, value) { // updates task data with one value alteration
    let data = eve.target.result
    data[field] = value
    let request = objectStore.put(data)
    return request
}

// Main code

let db // declared outside window.onload so it is not found to be undefined

window.onload = function () {
    let request = window.indexedDB.open('tasks', 1)
    request.onerror = function () {
        console.log('Database failed to load')
    }
    request.onsuccess = function () {
        console.log('Database successfully loaded')
        db = request.result
        displayAllTasks()
    }

    request.onupgradeneeded = function(eve) {
        let db = eve.target.result
        let objectStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement:true })
        objectStore.createIndex('name', 'name', { unique: false })
        objectStore.createIndex('description', 'description', { unique: false })
        objectStore.createIndex('completed', 'completed', { unique: false })
  
        console.log('Database setup complete') 
    }

    // Adds a task to the display given its parameters
    function displayTask (name, description, completed, id) {
        let task = document.createElement("div")
        task.setAttribute('task-id', id)
        task.appendChild(createInputField('taskname', name))
        task.appendChild(createInputField('taskdesc', description))
        task.appendChild(createButton('Delete Task', deleteTask, 'deleteBtn'))
        task.appendChild(createButton('Edit Task', editTask, 'editBtn'))
        task.appendChild(createButton('Edit Description', describeTask, 'describeBtn'))
        if (completed) {
            task.className = "task"
            task.appendChild(createButton('Set Task to Incomplete', incompleteTask, 'incompleteBtn'))
            main.insertBefore(task, null)
        } else {
            task.className = "taskToDo"
            task.appendChild(createButton('Task Completed', completeTask, 'completeBtn'))
            main.insertBefore(task, completeDivider)
        }
    }
    
    function displayAllTasks () {
        let objectStore = db.transaction('tasks').objectStore('tasks')
        let request = objectStore.openCursor()
        
        request.onsuccess = function (eve) {
            let cursor = eve.target.result      
            if(cursor) {
                displayTask(cursor.value.name, cursor.value.description, cursor.value.completed, cursor.value.id)
                cursor.continue()
            } else {
                checkAddEmptyMessage()
                console.log('Tasks all displayed')        
            }
        }
    }

    function addTask (eve) {
        eve.preventDefault()
        let taskname = nameInput.value
        let taskdesc = descriptionInput.value
        if ( taskname === '') {
            console.log('Please enter a task name')
            return null
        }
        let newTask = { name: taskname, description: taskdesc, completed: false }
        let [transaction, objectStore] = openRWTransaction(db)
        var request = objectStore.add(newTask)
    
        transaction.oncomplete = function() {
            nameInput.value = ''
            descriptionInput.value = ''
            console.log('Database successfully modified.')
            checkDelEmptyMessage()
            displayTask(newTask.name, newTask.description, false, request.result) // request.result contains new task id value
        }
        
        transaction.onerror = function() {
            console.log('Database modification failed.')
        }
    }

    form.onsubmit = addTask // set this addTask function as the callback action of form submission

    function deleteTask (eve) {
        let taskId = getTaskInfo(eve)[1]
        let [transaction, objectStore] = openRWTransaction(db)
        let request = objectStore.delete(taskId)
    
        transaction.oncomplete = function() {
            main.removeChild(eve.target.parentNode)
            console.log('Task ' + taskId + ' deleted')      
            checkAddEmptyMessage()
        }
    }
    
    function editTask (eve) {
        let task = eve.target.parentNode
        task.querySelector('input.taskname').disabled = false
        modifyButton(task.querySelector('button.editBtn'), 'Save Changes', acceptNameEdit, 'acceptNameEditBtn')
    }

    function describeTask (eve) {
        let task = eve.target.parentNode
        task.querySelector('input.taskdesc').disabled = false
        modifyButton(task.querySelector('button.describeBtn'), 'Save Changes', acceptDescEdit, 'acceptDescEditBtn')
    }

    function acceptNameEdit (eve) {
        let [task, taskId] = getTaskInfo(eve)
        let inputField = task.querySelector('input.taskname')
        let taskname = inputField.value
        if ( taskname === '') {
            console.log('Please enter a task name')
            return null
        }
        let [objectStore, request] = getTaskData(db, taskId)

        inputField.disabled = true
        request.onsuccess = function (eve) {
            let requestUpdate = storeTaskData(eve, objectStore, 'name', taskname)
            requestUpdate.onerror = function() {
                console.log('Database modification failed.')
            }
            requestUpdate.onsuccess = function() {
                console.log('Database successfully modified.')
                modifyButton(task.querySelector('button.acceptNameEditBtn'), 'Edit Task', editTask, 'editBtn')
            }
        }
    }

    function acceptDescEdit (eve) {
        let [task, taskId] = getTaskInfo(eve)
        let inputField = task.querySelector('input.taskdesc')
        let taskdesc = inputField.value
        let [objectStore, request] = getTaskData(db, taskId)

        inputField.disabled = true
        request.onsuccess = function (eve) {
            let requestUpdate = storeTaskData(eve, objectStore, 'description', taskdesc)
            requestUpdate.onerror = function() {
                console.log('Database modification failed.')
            }
            requestUpdate.onsuccess = function() {
                console.log('Database successfully modified.')
                modifyButton(task.querySelector('button.acceptDescEditBtn'), 'Edit Description', describeTask, 'describeBtn')
            }
        }
    }

    function setCompleted (eve, completed) {
        let [task, taskId] = getTaskInfo(eve)
        let [objectStore, request] = getTaskData(db, taskId)

        request.onsuccess = function (eve) {
            let requestUpdate = storeTaskData(eve, objectStore, 'completed', completed)
            requestUpdate.onerror = function() {
                console.log('Database modification failed.')
            }
            requestUpdate.onsuccess = function() {
                console.log('Database successfully modified.')
                if (completed) {
                    task.className = "task"
                    modifyButton(task.querySelector('button.completeBtn'), 'Set Task to Complete', incompleteTask, 'incompleteBtn')
                    main.insertBefore(task, null)
                    checkAddEmptyMessage()
                } else {
                    checkDelEmptyMessage()
                    task.className = "taskToDo"
                    modifyButton(task.querySelector('button.incompleteBtn'), 'Task Completed', completeTask, 'completeBtn')
                    main.insertBefore(task, completeDivider)
                }
            }
        }
    }

    function completeTask (eve) {
        setCompleted(eve, true)
    }
    
    function incompleteTask (eve) {
        setCompleted(eve, false)
    }
}
