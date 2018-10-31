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

function createButton (label, onclickFunc, cls) { // creates a button marked as given class, with text label and linked onclick function
    let button = document.createElement('button')
    button.appendChild(document.createTextNode(label))
    button.onclick = onclickFunc
    button.className = cls
    return button
}

function createInputField (cls, init_value) { // creates an input field marked as given class, with given initial value
    let input = document.createElement('input')
    input.type = 'text'
    input.className = cls
    input.value = init_value
    return input
}

function clearTask (task, index, nodelist) { // remove a given task from display
    main.removeChild(task)
}

function getTaskInfo (eve) { // get associated task div and its id from triggering event
    let task = eve.target.parentNode
    let taskId = Number(task.getAttribute('task-id'))
    return [task, taskId]
}

// Database helper functions

function openRWTransaction (db) { // opens a read-write transaction with db
    let transaction = db.transaction(['tasks'], 'readwrite')
    let objectStore = transaction.objectStore('tasks')
    return [transaction, objectStore]
}

function getTaskData (db, taskId) {
    let objectStore = openRWTransaction(db)[1]
    let request = objectStore.get(taskId)
    return [objectStore, request]
}

function storeTaskData (eve, objectStore, field, value) {
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
        task.className = "task"
        task.setAttribute('task-id', id)
        task.appendChild(createMessage('taskname', name))
        task.appendChild(createButton('delete', deleteTask, 'deleteBtn'))
        task.appendChild(createButton('edit', editTask, 'editBtn'))
        task.appendChild(createButton('describe', describeTask, 'describeBtn'))
        if (completed) {
            task.appendChild(createButton('not completed', incompleteTask, 'incompleteBtn'))
        } else {
            task.appendChild(createButton('completed', completeTask, 'completeBtn'))
        }
        task.appendChild(createMessage('taskdesc', description))
        main.insertBefore(task, inputDivider) // needs to change display point for completed tasks
    }
    
    function displayAllTasks () {
    
        // first clear away currently displayed tasks
        let tasks = document.querySelectorAll('div.task')
        tasks.forEach(clearTask)
    
        let objectStore = db.transaction('tasks').objectStore('tasks')
        let request = objectStore.openCursor()
        
        request.onsuccess = function (eve) {
            let cursor = eve.target.result
      
            if(cursor) {
                displayTask(cursor.value.name, cursor.value.description, cursor.value.completed, cursor.value.id)
                cursor.continue()
            } else {
                if(document.querySelectorAll('div.task').length === 0) {
                    let msg = createMessage('emptymsg', 'Twiddling my thumbs, nothing to do.')
                    main.insertBefore(msg, inputDivider)
                }
              console.log('Tasks all displayed')
            }
        }
    }

    function addTask (eve) {
        eve.preventDefault()
        let newTask = { name: nameInput.value, description: descriptionInput.value, completed: false }
        let [transaction, objectStore] = openRWTransaction(db)
        var request = objectStore.add(newTask)
    
        transaction.oncomplete = function() {
            nameInput.value = ''
            descriptionInput.value = ''
            console.log('Database successfully modified.')
            if(document.querySelectorAll('div.task').length === 0) { // if no tasks displayed, get rid of text node
                main.removeChild(document.querySelector('p.emptymsg'))
            }
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
      
            if(document.querySelectorAll('div.task').length === 0) {
                let msg = createMessage('emptymsg', 'Twiddling my thumbs, nothing to do.')
                main.insertBefore(msg, inputDivider)
            }
        }
    }
    
    function editTask (eve) {
        let task = eve.target.parentNode
        let nameDisplay = task.querySelector('p.taskname') // existing display
        task.replaceChild(createButton('accept changes', acceptNameEdit, 'acceptNameEditBtn'), task.querySelector('button.editBtn'))
        let input = createInputField('inputNameEdit', nameDisplay.innerHTML)
        task.replaceChild(input, nameDisplay) // change name text field to an input field with same value
    }

    function describeTask (eve) {
        let task = eve.target.parentNode
        let descDisplay = task.querySelector('p.taskdesc') // existing display
        task.replaceChild(createButton('accept changes', acceptDescEdit, 'acceptDescEditBtn'), task.querySelector('button.describeBtn'))
        let input = createInputField('inputDescEdit', descDisplay.innerHTML)
        task.replaceChild(input, descDisplay) // change name text field to an input field with same value
    }

    function acceptNameEdit (eve) {
        let [task, taskId] = getTaskInfo(eve)
        let inputField = task.querySelector('input.inputNameEdit') // existing input
        let taskname = inputField.value
        let [objectStore, request] = getTaskData(db, taskId)

        request.onsuccess = function (eve) {
            let requestUpdate = storeTaskData(eve, objectStore, 'name', taskname)
            requestUpdate.onerror = function() {
                console.log('Database modification failed.')
            }
            requestUpdate.onsuccess = function() {
                console.log('Database successfully modified.')
                task.replaceChild(createButton('edit', editTask, 'editBtn'), task.querySelector('button.acceptNameEditBtn'))
                task.replaceChild(createMessage('taskname', taskname), inputField)
            }
        }
    }

    function acceptDescEdit (eve) {
        let [task, taskId] = getTaskInfo(eve)
        let inputField = task.querySelector('input.inputDescEdit') // existing input
        let taskdesc = inputField.value
        let [objectStore, request] = getTaskData(db, taskId)

        request.onsuccess = function (eve) {
            let requestUpdate = storeTaskData(eve, objectStore, 'description', taskdesc)
            requestUpdate.onerror = function() {
                console.log('Database modification failed.')
            }
            requestUpdate.onsuccess = function() {
                console.log('Database successfully modified.')
                task.replaceChild(createButton('describe', describeTask, 'describeBtn'), task.querySelector('button.acceptDescEditBtn'))
                task.replaceChild(createMessage('taskdesc', taskdesc), inputField)
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
                    task.replaceChild(createButton('not completed', incompleteTask, 'incompleteBtn'), task.querySelector('button.completeBtn')) // change to incomplete button
                    main.insertBefore(task, null) // should it be inserted into place per task id order?
                } else {
                    task.replaceChild(createButton('completed', completeTask, 'completeBtn'), task.querySelector('button.incompleteBtn')) // change to complete button
                    main.insertBefore(task, inputDivider) // and this?
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
