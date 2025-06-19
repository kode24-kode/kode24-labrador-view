
#!/bin/bash
# sync.sh
rsync -avz --progress --delete ../view-resources -e ssh my_cluster:/home/cust
