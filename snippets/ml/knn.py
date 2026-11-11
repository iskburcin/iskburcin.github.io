from sklearn.neighbors import KNeighborsClassifier

# k = 3: a point gets the most common label of its 3 nearest neighbours
knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)
predictions = knn.predict(X_test)
