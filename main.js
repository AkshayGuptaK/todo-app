function deleteTask () {}
function editTask () {}
function commentTask () {}
function completeTask () {}

// Button Constructor
function LabelledButton (label, onclickFunc, cls) {
    this.btn = document.createElement('button')
    this.btn.appendChild(document.createTextNode(label))
    this.btn.onclick = onclickFunc
    this.btn.className = cls
}

var addTaskBtn = document.getElementById('addtask')
var tasks = []

addTaskBtn.onclick = function () {
    let taskName = document.getElementById('inputtask').value
    let task = document.createElement("div")
    task.className = 'task'
    tasks.push(task)
    task.appendChild(document.createTextNode(taskName))
    task.appendChild(new LabelledButton('delete', deleteTask, 'deleteBtn').btn)
    task.appendChild(new LabelledButton('edit', editTask, 'editBtn').btn)
    task.appendChild(new LabelledButton('comment', commentTask, 'commentBtn'))
    task.appendChild(new LabelledButton('completed', completeTask, 'completeBtn'))
    document.body.insertBefore(task, document.getElementById('inputDivider'))
}


