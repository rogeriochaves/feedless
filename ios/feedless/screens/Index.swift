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

struct StatusReponse : Codable {
    var status: String
    var loggedIn: Bool
}

class FetchContext: ObservableObject {
    @Published var status:SSBStatus = .initializing
    @Published var loggedIn:Bool = false
    @Published var profile:Profile? = nil

    func fetch() {
        let url = URL(string: "http://127.0.0.1:3000/context")!

        print("fetching context")

        URLSession.shared.dataTask(with: url) {(data, response, error) in
            print("got context response")
            if let todoData = data {
                do {
                    let decodedData = try JSONDecoder().decode(StatusReponse.self, from: todoData)
                    DispatchQueue.main.async {
                        if decodedData.status == "indexing" {
                            self.status = .indexing
                        } else if decodedData.status == "syncing" {
                            self.status = .syncing
                        } else if decodedData.status == "ready" {
                            self.status = .ready
                        } else {
                            self.status = .initializing
                        }
                        self.loggedIn = decodedData.loggedIn
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
    @ObservedObject var context = FetchContext()
    @State var timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            VStack {
                if (context.status != .ready) {
                    Text(statusToString(status: context.status))
                }
                if (false && context.loggedIn) {
                    Wall()
                } else {
                    NavigationView {
                        NavigationLink(destination: Login()) {
                            Text("Login")
                        }
                        .navigationBarTitle(Text("Index"))
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
        Index()
    }
}

