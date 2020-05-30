//
//  Context.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

enum SSBStatus {
    case initializing
    case indexing
    case syncing
    case ready
}

struct IndexingState : Codable {
    var current: Int
    var target: Int
}

struct StatusReponse : Codable {
    var status: String
    var indexingCurrent: Int
    var indexingTarget: Int
}

class Context: ObservableObject {
    @Published var status:SSBStatus = .initializing
    @Published var indexing = IndexingState(current: 0, target: 0)
    @Published var ssbKey:SSBKey? = nil

    init(ssbKey: SSBKey?, status: SSBStatus) {
        self.status = status
        self.ssbKey = ssbKey
        if ssbKey == nil {
            self.ssbKey = Utils.ssbKey()
        }
    }

    func setSSBKey(_ ssbKey: SSBKey) {
        self.ssbKey = ssbKey
    }

    func logout() {
        dataPost(path: "/logout", parameters: [:], type: PostResult.self, context: self, waitForIndexing: false) {(result) in
            self.ssbKey = nil
        }
    }

    func fetch() {
        let url = URL(string: "http://127.0.0.1:3000/context")!

        URLSession.shared.dataTask(with: url) {(data, response, error) in
            if let todoData = data {
                do {
                    let decodedData = try JSONDecoder().decode(StatusReponse.self, from: todoData)
                    DispatchQueue.main.async {
                        self.indexing = IndexingState(current: decodedData.indexingCurrent, target: decodedData.indexingTarget)
                        if decodedData.status == "indexing" {
                            self.status = .indexing
                        } else if decodedData.status == "syncing" {
                            self.status = .syncing
                        } else if decodedData.status == "ready" {
                            self.status = .ready
                        } else {
                            self.status = .initializing
                        }
                    }
                } catch {
                    Utils.debug("Error loading context")
                }
            }
        }.resume()
    }
}
