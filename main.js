// Create needed constants from elements
const nameInput = document.getElementById('inputTaskName')
const descriptionInput = document.getElementById('inputTaskDescription')
const form = document.querySelector('form')

// Button Constructor
function LabelledButton (label, onclickFunc, cls) {
    this.btn = document.createElement('button')
    this.btn.appendChild(document.createTextNode(label))
    this.btn.onclick = onclickFunc
    this.btn.className = cls
}

function displayTask (cursor) {
    let task = document.createElement("div")
    task.className = "task"
    task.appendChild(document.createTextNode(cursor.value.name))
    task.appendChild(new LabelledButton('delete', deleteTask, 'deleteBtn').btn)
    task.appendChild(new LabelledButton('edit', editTask, 'editBtn').btn)
    task.appendChild(new LabelledButton('describe', describeTask, 'describeBtn').btn)
    task.appendChild(new LabelledButton('completed', completeTask, 'completeBtn').btn)
    task.appendChild(document.createTextNode(cursor.value.description))
    let main = document.querySelector('main')
    main.insertBefore(task, document.getElementById('inputDivider'))
}

function deleteTask () {}
function editTask () {}
function describeTask () {}
function completeTask () {}

let db

window.onload = function () {
    let request = window.indexedDB.open('tasks', 1)
    request.onerror = function () {
        console.log('Database failed to load')
    }
    request.onsuccess = function () {
        console.log('Database loaded successfully')
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

    form.onsubmit = addTask

    function addTask (eve) {
        eve.preventDefault()
        let newTask = { name: nameInput.value, description: descriptionInput.value, completed: false }
        let transaction = db.transaction(['tasks'], 'readwrite')
        let objectStore = transaction.objectStore('tasks')
        var request = objectStore.add(newTask)
        request.onsuccess = function () {
            nameInput.value = ''
            descriptionInput.value = ''
        }
    
        transaction.oncomplete = function() {
            console.log('Transaction completed: database modification finished.')
            displayAllTasks()
        }
        
        transaction.onerror = function() {
            console.log('Transaction not opened due to error')
        }
    }

    function clearTask (task, index, nodelist) { // remove a task from display
        let main = document.querySelector('main')
        main.removeChild(task)
    }

    function displayAllTasks () {

        // first clear away currently displayed tasks
        let tasks = document.querySelectorAll('div.task')
        tasks.forEach(clearTask)


        let objectStore = db.transaction('tasks').objectStore('tasks')
        objectStore.openCursor().onsuccess = function(e) {
            let cursor = e.target.result
      
            if(cursor) {
                displayTask(cursor)
                cursor.continue()
            } else {
              if(document.querySelectorAll('div.task').length === 0) { // needs testing
                let main = document.querySelector('main') 
                main.insertBefore(document.createTextNode('No tasks stored.'), document.getElementById('inputDivider'))
              }
              console.log('Tasks all displayed')
            }
        }
    }
}
