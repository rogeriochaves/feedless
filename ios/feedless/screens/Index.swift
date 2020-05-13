//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

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
    @Published var profile:Profile? = nil
    @Published var indexing = IndexingState(current: 0, target: 0)
    @Published var ssbKey:SSBKey? = nil

    init(ssbKey: SSBKey?, status: SSBStatus) {
        self.status = status
        self.ssbKey = ssbKey
        DispatchQueue.main.async {
            self.ssbKey = Utils.ssbKey()
        }
    }

    func setSSBKey(_ ssbKey: SSBKey) {
        self.ssbKey = ssbKey
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
                    print("Error loading context")
                }
            }
        }.resume()
    }
}

func statusToString(status: SSBStatus) -> String {
    switch status {
    case .initializing:
        return "Initializing"
    case .indexing:
        return "Indexing"
    case .syncing:
        return "Syncing"
    case .ready:
        return "Ready"
    }
}

struct Index: View {
    @EnvironmentObject var context : Context
    @State var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()
    @State var loginKey = "";
    @State var errorMessage = "";

    func login(key: String) {
        let decoder = JSONDecoder()
        let cleanKey = key.replacingOccurrences(of: "^#.*$", with: "", options: [.regularExpression])

        guard
            let jsonString = cleanKey.data(using: .utf8),
            let ssbKey = try? decoder.decode(SSBKey.self, from: jsonString)
        else {
            errorMessage = "Invalid key!"
            return
        }

        do {
            FileManager.default.createFile(
                atPath: Utils.ssbFolder() + "/secret",
                contents: key.data(using: .utf8),
                attributes: [.posixPermissions: 0x100]
            )
            if (FileManager.default.fileExists(atPath: Utils.ssbFolder() + "/logged-out")) {
                try FileManager.default.removeItem(atPath: Utils.ssbFolder() + "/logged-out")
            }
            self.context.setSSBKey(ssbKey)
        } catch {
            errorMessage = "Error saving secrets file"
        }
    }

    var body: some View {
        Group {
            VStack {
                if (context.status != .ready) {
                    Text(statusToString(status: context.status))
                    if (context.status == .indexing && context.indexing.target > 0) {
                        Text(String(context.indexing.current) + "/" + String(context.indexing.target))
                    }
                }
                if (context.ssbKey != nil) {
                    if (context.status == .syncing || context.status == .ready) {
                        Wall()
                    } else {
                        NavigationView {
                            Text("Loading...")
                        }
                    }
                } else {
                    NavigationView {
                        // NavigationLink(destination: Login()) {
                        VStack {
                            if (!errorMessage.isEmpty) {
                                Text(errorMessage)
                            }
                            SecureField("Enter your key", text: $loginKey)
                                .padding()
                            Button(action: { self.login(key: self.loginKey) }) {
                                HStack {
                                    Text("Submit")
                                }
                                    .frame(minWidth: 0, maxWidth: .infinity)
                                    .padding()
                                    .cornerRadius(40)
                                    .background(Color(red: 0.5, green: 0.9, blue: 0.9))
                                    .foregroundColor(Color(.black))
                            }
                        }
                            // }
                            .navigationBarTitle(Text("Login"))
                    }
                }
            }
        }
        .onReceive(self.timer) { (_) in
            if (self.context.status != .ready) {
                self.context.fetch()
            }
        }
    }
}

struct Index_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            Index()
                .environmentObject(Context(ssbKey: nil, status: .initializing))

            Index()
                .environmentObject(
                    Context(
                        ssbKey: SSBKey(
                            curve: "foo",
                            publicKey: "bar",
                            privateKey: "baz",
                            id: "qux"
                        ),
                        status: .ready
                    )
            )
        }
    }
}

